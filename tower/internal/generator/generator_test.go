package generator

import (
	"encoding/json"
	"strings"
	"testing"

	yamlv3 "gopkg.in/yaml.v3"

	"github.com/kenzok8/tower/internal/model"
)

func sampleNodes() []model.ProxyNode {
	return []model.ProxyNode{
		{Kind: model.KindShadowsocks, Name: "香港 01", Server: "hk.example.com", Port: 8388, Cipher: "aes-256-gcm", Password: "pass123"},
		{Kind: model.KindTrojan, Name: "日本 02", Server: "jp.example.com", Port: 443, Password: "pass456", TLS: true, SNI: "jp.example.com", Transport: "ws", Path: "/ws"},
		{Kind: model.KindVMess, Name: "美国 03", Server: "us.example.com", Port: 443, UUID: "12345678-1234-4321-8765-123456789abc", Cipher: "auto", Transport: "ws", Path: "/ws", HostHeader: "us.example.com", TLS: true},
	}
}

func TestGenerateClash(t *testing.T) {
	out, err := Generate(Options{Target: model.ClientClashVerge, Nodes: sampleNodes()})
	if err != nil {
		t.Fatal(err)
	}
	var doc map[string]any
	if err := yamlv3.Unmarshal([]byte(out), &doc); err != nil {
		t.Fatalf("clash output is not valid YAML: %v\n%s", err, out)
	}
	proxies, ok := doc["proxies"].([]any)
	if !ok || len(proxies) != 3 {
		t.Fatalf("want 3 proxies, got %v", doc["proxies"])
	}
	if !strings.Contains(out, "type: ss") || !strings.Contains(out, "type: trojan") || !strings.Contains(out, "type: vmess") {
		t.Errorf("clash output missing proxy types:\n%s", out)
	}
}

func TestGenerateSingBox(t *testing.T) {
	out, err := Generate(Options{Target: model.ClientSingBox, Nodes: sampleNodes()})
	if err != nil {
		t.Fatal(err)
	}
	var doc map[string]any
	if err := json.Unmarshal([]byte(out), &doc); err != nil {
		t.Fatalf("sing-box output is not valid JSON: %v\n%s", err, out)
	}
	ob, ok := doc["outbounds"].([]any)
	if !ok {
		t.Fatalf("outbounds missing: %v", doc["outbounds"])
	}
	// 3 nodes + selector + urltest + direct = 6
	if len(ob) != 6 {
		t.Errorf("want 6 outbounds, got %d", len(ob))
	}
}

func TestGenerateSurge(t *testing.T) {
	out, err := Generate(Options{Target: model.ClientSurge, Nodes: sampleNodes()})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "[Proxy]") || !strings.Contains(out, "[Proxy Group]") || !strings.Contains(out, "[Rule]") {
		t.Errorf("surge output missing sections:\n%s", out)
	}
	if !strings.Contains(out, "香港 01 = ss,") {
		t.Errorf("surge output missing ss node:\n%s", out)
	}
}

func TestNotImplemented(t *testing.T) {
	_, err := Generate(Options{Target: model.ClientLoon, Nodes: sampleNodes()})
	if err == nil {
		t.Error("loon should not be implemented yet")
	}
}
