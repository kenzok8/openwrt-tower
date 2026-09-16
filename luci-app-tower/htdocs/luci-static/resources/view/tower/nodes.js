'use strict';
'require view';
'require tower';

return view.extend({
	load: function() {
		return L.resolveDefault(tower.rpcListNodes(), []);
	},

	render: function(nodes) {
		var tableRows = [
			E('tr', { 'class': 'cbi-section-table-titles' }, [
				E('th', { 'class': 'th left' }, [ _('Name') ]),
				E('th', { 'class': 'th' }, [ _('Type') ]),
				E('th', { 'class': 'th left' }, [ _('Server') ])
			])
		];

		if (nodes.length === 0)
			tableRows.push(E('tr', {}, [ E('td', { 'class': 'td', 'colspan': 3 }, [ _('No nodes. Add a subscription first.') ]) ]));
		else
			tableRows = tableRows.concat(nodes.map(function(n) {
				return E('tr', {}, [
					E('td', { 'class': 'td left' }, [ n.name ]),
					E('td', { 'class': 'td' }, [ n.kind ]),
					E('td', { 'class': 'td left' }, [ n.server + ':' + n.port ])
				]);
			}));

		return E('div', { 'class': 'cbi-map' }, [
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Nodes') ]),
				E('div', { 'class': 'cbi-section-node' }, [
					E('table', { 'class': 'cbi-section-table' }, tableRows)
				])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
