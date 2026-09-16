'use strict';
'require baseclass';
'require rpc';

const callListSubs = rpc.declare({ object: 'luci.tower', method: 'subscriptions' });
const callListNodes = rpc.declare({ object: 'luci.tower', method: 'nodes' });
const callAddSub = rpc.declare({ object: 'luci.tower', method: 'add_subscription', params: ['name', 'url', 'user_agent'] });
const callRemoveSub = rpc.declare({ object: 'luci.tower', method: 'remove_subscription', params: ['id'] });
const callRefresh = rpc.declare({ object: 'luci.tower', method: 'refresh', params: ['id'] });
const callExport = rpc.declare({ object: 'luci.tower', method: 'export', params: ['target', 'protocols', 'nodes'] });
const callImport = rpc.declare({ object: 'luci.tower', method: 'import_nodes', params: ['content'] });

/* Client targets currently implemented. Phase 2 adds Loon, QuanX, Egern, V2Box. */
const clients = [
	{ id: 'clash-verge', name: 'Clash Verge' },
	{ id: 'clash', name: 'Stash' },
	{ id: 'clash-apple', name: 'Clash' },
	{ id: 'clashmac', name: 'ClashMac' },
	{ id: 'flclash', name: 'FlClash' },
	{ id: 'mihomo-party', name: 'Mihomo Party' },
	{ id: 'clash-mi', name: 'Clash Mi' },
	{ id: 'karing', name: 'Karing' },
	{ id: 'sing-box', name: 'sing-box MT' },
	{ id: 'hiddify', name: 'Hiddify' },
	{ id: 'surge', name: 'Surge' },
	{ id: 'surge-mac', name: 'Surge Mac' },
	{ id: 'shadowrocket', name: 'Shadowrocket' }
];

/* Protocol filter options. */
/* User-Agent presets for subscription fetch. */
const userAgents = [
	{ id: '', name: _('自动选择 User-Agent（推荐）') },
	{ id: 'ClashMeta', name: 'ClashMeta' },
	{ id: 'clash-verge/v2.4.2', name: 'clash-verge/v2.4.2' },
	{ id: 'ClashForWindows/0.20.39', name: 'ClashForWindows/0.20.39' },
	{ id: 'Clash', name: 'Clash' },
	{ id: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', name: _('浏览器 User-Agent') }
];

const protocols = [
	{ id: 'ss', name: 'Shadowsocks' },
	{ id: 'ssr', name: 'ShadowsocksR' },
	{ id: 'vmess', name: 'VMess' },
	{ id: 'vless', name: 'VLESS' },
	{ id: 'trojan', name: 'Trojan' },
	{ id: 'hysteria', name: 'Hysteria' },
	{ id: 'hysteria2', name: 'Hysteria 2' },
	{ id: 'tuic', name: 'TUIC' },
	{ id: 'wireguard', name: 'WireGuard' },
	{ id: 'anytls', name: 'AnyTLS' },
	{ id: 'snell', name: 'Snell' },
	{ id: 'socks5', name: 'SOCKS5' },
	{ id: 'http', name: 'HTTP' }
];

return baseclass.extend({
	rpcListSubs: function() {
		return L.resolveDefault(callListSubs(), { data: [] }).then(function(r) { return r.data; });
	},
	rpcListNodes: function() {
		return L.resolveDefault(callListNodes(), { data: [] }).then(function(r) { return r.data; });
	},
	rpcAddSub: function(name, url, ua) {
		return L.resolveDefault(callAddSub(name, url, ua), { data: null }).then(function(r) { return r.data; });
	},
	rpcRemoveSub: function(id) {
		return L.resolveDefault(callRemoveSub(id), { success: false });
	},
	rpcRefresh: function(id) {
		return L.resolveDefault(callRefresh(id), { data: [] }).then(function(r) { return r.data; });
	},
	rpcExport: function(target, protocols, nodes) {
		return L.resolveDefault(callExport(target, protocols, nodes), { content: '' }).then(function(r) { return r.content; });
	},
	rpcImport: function(content) {
		return L.resolveDefault(callImport(content), { imported: 0 });
	},
	clients: clients,
	protocols: protocols,
	userAgents: userAgents
});
