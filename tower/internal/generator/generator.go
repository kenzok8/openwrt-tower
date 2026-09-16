// Package generator turns a node list into a client configuration.
//
// It ports the Swift ConfigurationGenerator. Each client family emits a
// different wire format (Clash YAML, sing-box JSON, Surge INI, …). Node names
// are untrusted airport input and are escaped before being written.
package generator

import (
	"crypto/sha1"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/kenzok8/tower/internal/model"
)

// Options are the inputs to a single configuration generation.
type Options struct {
	Target model.ClientTarget
	Nodes  []model.ProxyNode
	// Protocols is the set of enabled proxy kinds. Nil means all protocols.
	Protocols []model.ProxyKind
}

// Generate renders a full configuration for the target client.
func Generate(opts Options) (string, error) {
	opts.Nodes = FilterNodes(opts.Nodes, opts.Protocols)
	switch opts.Target.Family() {
	case model.FamilyClash:
		return generateClash(opts), nil
	case model.FamilySingBox:
		return generateSingBox(opts), nil
	case model.FamilySurge:
		return generateSurge(opts, false), nil
	case model.FamilyShadowrocket:
		return generateSurge(opts, true), nil
	default:
		return "", fmt.Errorf("client %s is not implemented yet", opts.Target.Name())
	}
}

// FilterNodes drops nodes whose protocol is not in the enabled set. A nil or
// empty set keeps everything.
func FilterNodes(nodes []model.ProxyNode, protocols []model.ProxyKind) []model.ProxyNode {
	if len(protocols) == 0 {
		return nodes
	}
	enabled := make(map[model.ProxyKind]bool, len(protocols))
	for _, p := range protocols {
		enabled[p] = true
	}
	out := make([]model.ProxyNode, 0, len(nodes))
	for _, n := range nodes {
		if enabled[n.Kind] {
			out = append(out, n)
		}
	}
	return out
}

// header writes the leading comment block.
func header(target model.ClientTarget) string {
	return fmt.Sprintf("# Generated locally by Tower for %s\n# Subscription credentials never leave this device.\n\n", target.Name())
}

// yaml quotes and escapes a value for a double-quoted YAML scalar.
func yaml(value string) string {
	escaped := collapseLineBreaks(value)
	escaped = strings.ReplaceAll(escaped, "\\", "\\\\")
	escaped = strings.ReplaceAll(escaped, "\"", "\\\"")
	return "\"" + escaped + "\""
}

func collapseLineBreaks(value string) string {
	value = strings.ReplaceAll(value, "\r\n", " ")
	value = strings.ReplaceAll(value, "\r", " ")
	value = strings.ReplaceAll(value, "\n", " ")
	return value
}

// exportableUUID returns the VMess/VLESS id in the form every client accepts.
// Xray allows any id shorter than 32 bytes and derives a v5 UUID from it, but
// Clash refuses anything that is not a UUID, so the same derivation is done
// here.
func exportableUUID(uuid string) string {
	t := strings.TrimSpace(uuid)
	if t == "" {
		return ""
	}
	if isUUID(t) {
		return strings.ToLower(t)
	}
	if utf8.RuneCountInString(t) >= 32 {
		return ""
	}
	return derivedUUID(t)
}

func isUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, r := range s {
		switch i {
		case 8, 13, 18, 23:
			if r != '-' {
				return false
			}
		default:
			if !isHex(r) {
				return false
			}
		}
	}
	return true
}

func isHex(r rune) bool {
	return (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')
}

func derivedUUID(text string) string {
	h := sha1.New()
	h.Write(make([]byte, 16)) // nil UUID namespace
	h.Write([]byte(text))
	b := h.Sum(nil)[:16]
	b[6] = (b[6] & 0x0F) | 0x50 // version 5
	b[8] = (b[8] & 0x3F) | 0x80 // RFC 4122 variant
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// csv splits a comma-separated field into trimmed, non-empty values.
func csv(value string) []string {
	var out []string
	for _, part := range strings.Split(value, ",") {
		p := strings.TrimSpace(part)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// yamlList renders a string slice as a YAML inline list.
func yamlList(values []string) string {
	parts := make([]string, 0, len(values))
	for _, v := range values {
		parts = append(parts, yaml(v))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

// displayName returns the node name to use in output, falling back to endpoint.
func displayName(n model.ProxyNode) string {
	name := strings.TrimSpace(n.Name)
	if name == "" {
		return n.Server
	}
	return name
}

// uniquedNames de-duplicates node names, appending a suffix on collisions so
// group membership stays unambiguous.
func uniquedNames(nodes []model.ProxyNode) []string {
	counts := map[string]int{}
	out := make([]string, 0, len(nodes))
	for _, n := range nodes {
		base := displayName(n)
		counts[base]++
		c := counts[base]
		if c == 1 {
			out = append(out, base)
		} else {
			out = append(out, fmt.Sprintf("%s · %d", base, c))
		}
	}
	return out
}
