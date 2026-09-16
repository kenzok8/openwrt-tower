// Package api exposes the backend over a localhost HTTP API consumed by the
// LuCI frontend.
package api

import (
	"encoding/json"
	"net/http"

	"github.com/kenzok8/tower/internal/model"
	"github.com/kenzok8/tower/internal/service"
)

// Server wires the service into HTTP handlers.
type Server struct {
	svc *service.Service
}

// New creates a Server.
func New(svc *service.Service) *Server {
	return &Server{svc: svc}
}

// Handler returns the routed HTTP handler.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/state", s.handleState)
	mux.HandleFunc("/api/subscriptions", s.handleSubscriptions)
	mux.HandleFunc("/api/subscriptions/refresh", s.handleRefresh)
	mux.HandleFunc("/api/nodes", s.handleNodes)
	mux.HandleFunc("/api/export", s.handleExport)
	return mux
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	state, err := s.svc.Store.Load()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, state)
}

func (s *Server) handleSubscriptions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		state, err := s.svc.Store.Load()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, state.Subscriptions)

	case http.MethodPost:
		var req struct {
			Name      string `json:"name"`
			URL       string `json:"url"`
			UserAgent string `json:"user_agent,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		sub, err := s.svc.AddSubscription(req.Name, req.URL, req.UserAgent)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, sub)

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if err := s.svc.RemoveSubscription(id); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) handleRefresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	results, err := s.svc.Refresh(r.URL.Query().Get("id"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, results)
}

func (s *Server) handleNodes(w http.ResponseWriter, r *http.Request) {
	state, err := s.svc.Store.Load()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, state.Nodes)
}

func (s *Server) handleExport(w http.ResponseWriter, r *http.Request) {
	target := parseTarget(r.URL.Query().Get("target"))
	if target == "" {
		writeError(w, http.StatusBadRequest, "unknown target: "+r.URL.Query().Get("target"))
		return
	}
	protocols := service.ParseProtocols(r.URL.Query().Get("protocols"))
	nodeIDs := service.ParseNodeIDs(r.URL.Query().Get("nodes"))
	out, err := s.svc.Export(target, protocols, nodeIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte(out))
}

func parseTarget(name string) model.ClientTarget {
	for _, c := range model.AllClients {
		if string(c) == name {
			return c
		}
	}
	return ""
}
