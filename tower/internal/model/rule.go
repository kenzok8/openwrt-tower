package model

// RulePolicy is the policy a rule routes matching traffic into.
type RulePolicy string

const (
	PolicyDirect        RulePolicy = "direct"
	PolicyReject        RulePolicy = "reject"
	PolicySelect        RulePolicy = "select"
	PolicyAuto          RulePolicy = "auto"
	PolicyInternational RulePolicy = "international"
	PolicyDomestic      RulePolicy = "domestic"
	PolicyForeignAds    RulePolicy = "foreign-ads"
	PolicyAI            RulePolicy = "ai"
	PolicyYouTube       RulePolicy = "youtube"
	PolicyMedia         RulePolicy = "media"
	PolicyTelegram      RulePolicy = "telegram"
	PolicyGoogleFCM     RulePolicy = "google-fcm"
	PolicyApple         RulePolicy = "apple"
	PolicyMicrosoft     RulePolicy = "microsoft"
	PolicyGoogle        RulePolicy = "google"
)

// ConfigurationName returns the policy name used inside generated configs.
func (p RulePolicy) ConfigurationName() string {
	switch p {
	case PolicyDirect:
		return "DIRECT"
	case PolicyReject:
		return "REJECT"
	case PolicySelect:
		return "节点选择"
	case PolicyAuto:
		return "自动选择"
	case PolicyInternational:
		return "国际流量"
	case PolicyDomestic:
		return "国内流量"
	case PolicyForeignAds:
		return "国外广告"
	case PolicyAI:
		return "AI服务"
	case PolicyYouTube:
		return "YouTube"
	case PolicyMedia:
		return "国外媒体"
	case PolicyTelegram:
		return "Telegram"
	case PolicyGoogleFCM:
		return "Google FCM"
	case PolicyApple:
		return "苹果服务"
	case PolicyMicrosoft:
		return "Microsoft"
	case PolicyGoogle:
		return "谷歌服务"
	default:
		return string(p)
	}
}

// RuleSchemeGroup describes a strategy group in a rule scheme: which nodes it
// contains (by name pattern or subscription binding), its type, and options.
type RuleSchemeGroup struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Type        string     `json:"type"` // select, urltest, fallback, load-balance
	Policy      RulePolicy `json:"policy,omitempty"`
	IsBase      bool       `json:"is_base,omitempty"`
	Members     []string   `json:"members,omitempty"` // group names or node name patterns
	UseAllNodes bool       `json:"use_all_nodes,omitempty"`
	URL         string     `json:"url,omitempty"` // urltest target
	Interval    int        `json:"interval,omitempty"`
}

// RuleScheme is a named rule set (ACL4SSR preset or user scheme).
type RuleScheme struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Groups         []RuleSchemeGroup `json:"groups"`
	Rules          []string          `json:"rules,omitempty"` // raw rule lines
	FinalPolicy    RulePolicy        `json:"final_policy"`
	IncludeGeoIPCN bool              `json:"include_geoip_cn,omitempty"`
}
