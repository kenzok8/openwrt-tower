// Package service holds the core operations shared by the HTTP daemon and the
// CLI entry points: add/remove/refresh subscriptions and generate configs.
package service

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/kenzok8/tower/internal/generator"
	"github.com/kenzok8/tower/internal/model"
	"github.com/kenzok8/tower/internal/parser"
	"github.com/kenzok8/tower/internal/store"
)

// Service bundles the store with the subscription fetch path.
type Service struct {
	Store *store.Store
}

// New creates a Service.
func New(st *store.Store) *Service { return &Service{Store: st} }

// RefreshResult reports the outcome of refreshing one subscription.
type RefreshResult struct {
	ID       string `json:"id"`
	Nodes    int    `json:"nodes"`
	Rejected int    `json:"rejected"`
	Error    string `json:"error,omitempty"`
}

// AddSubscription inserts a new subscription source.
func (s *Service) AddSubscription(name, url, userAgent string) (model.SubscriptionSource, error) {
	if url == "" {
		return model.SubscriptionSource{}, fmt.Errorf("url is required")
	}
	if name == "" {
		name = url
	}
	sub := model.SubscriptionSource{
		ID:        model.NewID(),
		Name:      name,
		URL:       url,
		Enabled:   true,
		CreatedAt: time.Now(),
	}
	if userAgent != "" {
		sub.RequestOptions = &model.RequestOptions{UserAgent: userAgent}
	}
	if _, err := s.Store.Update(func(st *store.State) error {
		st.Subscriptions = append(st.Subscriptions, sub)
		return nil
	}); err != nil {
		return model.SubscriptionSource{}, err
	}
	return sub, nil
}

// ImportNodes parses a pasted config (URI list / Clash YAML / Surge INI / Base64)
// and appends the detected nodes as local nodes (no subscription source).
func (s *Service) ImportNodes(content string) (int, error) {
	parsed := parser.Parse([]byte(content), "")
	if len(parsed.Nodes) == 0 {
		return 0, fmt.Errorf("no nodes found in input")
	}
	_, err := s.Store.Update(func(st *store.State) error {
		st.Nodes = append(st.Nodes, parsed.Nodes...)
		return nil
	})
	if err != nil {
		return 0, err
	}
	return len(parsed.Nodes), nil
}

// RemoveSubscription deletes a subscription and its parsed nodes.
func (s *Service) RemoveSubscription(id string) error {
	_, err := s.Store.Update(func(st *store.State) error {
		var subs []model.SubscriptionSource
		for _, sub := range st.Subscriptions {
			if sub.ID != id {
				subs = append(subs, sub)
			}
		}
		st.Subscriptions = subs
		var nodes []model.ProxyNode
		for _, n := range st.Nodes {
			if n.SourceID != id {
				nodes = append(nodes, n)
			}
		}
		st.Nodes = nodes
		return nil
	})
	return err
}

// Refresh fetches and re-parses one subscription (id) or all (id == "").
func (s *Service) Refresh(id string) ([]RefreshResult, error) {
	state, err := s.Store.Load()
	if err != nil {
		return nil, err
	}
	var targets []model.SubscriptionSource
	if id != "" {
		for _, sub := range state.Subscriptions {
			if sub.ID == id {
				targets = append(targets, sub)
				break
			}
		}
	} else {
		targets = state.Subscriptions
	}
	if len(targets) == 0 {
		return nil, fmt.Errorf("subscription not found")
	}

	results := []RefreshResult{}
	_, err = s.Store.Update(func(st *store.State) error {
		for _, sub := range targets {
			var current *model.SubscriptionSource
			for i := range st.Subscriptions {
				if st.Subscriptions[i].ID == sub.ID {
					current = &st.Subscriptions[i]
					break
				}
			}
			if current == nil {
				continue
			}
			ua := ""
			if current.RequestOptions != nil {
				ua = current.RequestOptions.UserAgent
			}
			res := RefreshResult{ID: current.ID}
			body, err := FetchSubscription(current.URL, ua)
			if err != nil {
				res.Error = err.Error()
				current.LastError = err.Error()
				results = append(results, res)
				continue
			}
			parsed := parser.Parse(body, current.ID)
			now := time.Now()
			current.LastUpdatedAt = &now
			current.LastError = ""
			current.Usage = parsed.Status
			var nodes []model.ProxyNode
			for _, n := range st.Nodes {
				if n.SourceID != current.ID {
					nodes = append(nodes, n)
				}
			}
			nodes = append(nodes, parsed.Nodes...)
			st.Nodes = nodes
			res.Nodes = len(parsed.Nodes)
			res.Rejected = parsed.RejectedLineCount
			results = append(results, res)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return results, nil
}

// Export generates a configuration for the given client target. protocols is
// the set of enabled proxy kinds (nil = all); nodeIDs limits output to specific
// nodes (nil = all).
func (s *Service) Export(target model.ClientTarget, protocols []model.ProxyKind, nodeIDs []string) (string, error) {
	state, err := s.Store.Load()
	if err != nil {
		return "", err
	}
	nodes := state.Nodes
	if len(nodeIDs) > 0 {
		want := make(map[string]bool, len(nodeIDs))
		for _, id := range nodeIDs {
			want[id] = true
		}
		filtered := make([]model.ProxyNode, 0, len(nodes))
		for _, n := range nodes {
			if want[n.ID] {
				filtered = append(filtered, n)
			}
		}
		nodes = filtered
	}
	return generator.Generate(generator.Options{Target: target, Nodes: nodes, Protocols: protocols})
}

// ParseNodeIDs splits a comma-separated node id list.
func ParseNodeIDs(raw string) []string {
	if raw == "" {
		return nil
	}
	seen := map[string]bool{}
	var out []string
	for _, part := range strings.Split(raw, ",") {
		id := strings.TrimSpace(part)
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}

// ParseProtocols splits a comma-separated protocol list into ProxyKind values.
func ParseProtocols(raw string) []model.ProxyKind {
	if raw == "" {
		return nil
	}
	seen := map[model.ProxyKind]bool{}
	var out []model.ProxyKind
	for _, part := range strings.Split(raw, ",") {
		k := model.ProxyKind(strings.TrimSpace(part))
		if k == "" || k == model.KindUnknown || seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, k)
	}
	return out
}

// FetchSubscription downloads a subscription payload.
//
// An empty userAgent means "auto": it tries a sequence of common client UAs and
// accepts the first response that parses to nodes. Airports that only support
// non-Clash formats return a Base64 share link regardless of UA, which the
// parser also understands, so the first attempt usually succeeds.
func FetchSubscription(url, userAgent string) ([]byte, error) {
	if strings.TrimSpace(userAgent) != "" {
		return fetchOnce(url, userAgent)
	}

	for _, ua := range []string{"clash-verge/v2.4.2", "ClashMeta", "ClashForWindows/0.20.39", "Clash"} {
		body, err := fetchOnce(url, ua)
		if err != nil {
			continue
		}
		if len(parser.Parse(body, "").Nodes) > 0 {
			return body, nil
		}
	}
	return nil, fmt.Errorf("no nodes found at %s", url)
}

func fetchOnce(url, userAgent string) ([]byte, error) {
	client := &http.Client{Timeout: 20 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 50<<20))
}
