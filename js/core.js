dojo.require('dojo.io.script');

dojo.declare('fhApp', null, {
	// summary:
	//		Main app object

	urls: {
		states: 'http://api.geonames.org/childrenJSON',
		search: 'http://api.geonames.org/searchJSON'
	},

	// username: String
	//		My geonames.org username
	username: 'stdavis',

	// USid: String
	//		The geonameid of the US
	USid: '6252001',

	// maxRows: Number
	//		The max rows allowed back from the server
	maxRows: 500,


	// dom nodes

	// errorContainer: div
	errorContainer: null,

	// errorText: div
	errorText: null,

	// statesSelect: HTML Select
	statesSelect: null,

	// typeSelect: HTML Select
	typeSelect: null,

	// startsWithBox: HTML TextBox
	startsWithBox: null,

	// goBtn: HTML Button
	goBtn: null,

	// resultsContainer: div
	resultsContainer: null,

	// warningContainer: div
	warningContainer: null,

	// loader: img
	loader: null,

	citiesFeatureCode: 'PPL',
	countiesFeatureCode: 'ADM2',

	constructor: function () {
		// get dom node references
		this.errorContainer = dojo.byId('error-container');
		this.errorText = dojo.byId('error-text');
		this.statesSelect = dojo.byId('states-select');
		this.typeSelect = dojo.byId('type-select');
		this.startsWithBox = dojo.byId('starts-with-textbox');
		this.goBtn = dojo.byId('go-button');
		this.resultsContainer = dojo.byId('results-container');
		this.warningContainer = dojo.byId('warning-text');
		this.loader = dojo.byId('loader');

		this.wireEvents();

		this.getStates();
	},
	wireEvents: function () {
		// summary:
		//		Wires up all of the events for the page

		dojo.connect(this.goBtn, 'onclick', this, 'onGo');
	},
	getStates: function () {
		// summary:
		//		Fires request to get all US states

		var params = {
			url: this.urls.states,
			content: {
				username: this.username,
				geonameId: this.USid
			},
			handleAs: 'json',
			callbackParamName: 'callback',
			load: dojo.hitch(this, 'loadStates'),
			error: dojo.hitch(this, 'onError')
		};
		dojo.io.script.get(params);
	},
	onError: function (er) {
		// summary:
		//		handles all xhr errors
		console.error(er);

		this.errorText.innerHTML = er.message;
		dojo.removeClass(this.errorContainer, 'hidden');

		dojo.addClass(this.loader, 'hidden');
	},
	loadStates: function (response) {
		// summary:
		//		callback from getStates

		// check to make sure that there were results
		if (!response.totalResultsCount || response.totalResultsCount === 0) {
			this.onError({message: 'No States where found.'});
		} else {
			console.log(response.totalResultsCount + ' states found.');

			dojo.forEach(response.geonames, function (gname) {
				dojo.create('option', {
					value: gname.adminCode1,
					innerHTML: gname.name
				}, this.statesSelect);
			}, this);
		}

		dojo.addClass(this.loader, 'hidden');
	},
	onGo: function () {
		// summary:
		//		Fires when the user clicks the go button
		dojo.addClass(this.errorContainer, 'hidden');
		this.resultsContainer.innerHTML = '';
		dojo.addClass(this.warningContainer, 'hidden');
		dojo.removeClass(this.loader, 'hidden');

		var fcode;
		if (this.typeSelect.value === 'cities') {
			// make sure that at least one letter is in starts with
			if (this.startsWithBox.value.length === 0) {
				this.showWarning('Please type at least one letter into "Name starts with"');
				dojo.addClass(this.loader, 'hidden');
				return;
			}
			fcode = this.citiesFeatureCode;
		} else {
			fcode = this.countiesFeatureCode;
		}

		var params = {
			url: this.urls.search,
			content: {
				username: this.username,
				adminCode1: this.statesSelect.value,
				maxRows: this.maxRows,
				featureCode: fcode
			},
			handleAs: 'json',
			callbackParamName: 'callback',
			load: dojo.hitch(this, 'loadResults'),
			error: dojo.hitch(this, 'onError')
		};
		var startsWith = this.startsWithBox.value;
		if (startsWith) {
			params.content.name_startsWith = startsWith;
		}
		dojo.io.script.get(params);
	},
	loadResults: function (response) {
		// summary:
		//		callback for the search query

		function sortArray(a, b) {
			return (a.name < b.name) ? -1 : 1;
		}

		// check to make sure that there were results
		results = [];
		if (!response.totalResultsCount || response.totalResultsCount === 0) {
			this.showWarning('No results were found.');
		} else {
			console.log(response.geonames.length + ' results found.');

			if (response.geonames.length >= this.maxRows) {
				this.showWarning('There were more than the maximum number of records returned (500). You may want to type more letters into "Name starts with".');
			}
			response.geonames.sort(sortArray);
			dojo.forEach(response.geonames, function (gname) {
				if (dojo.indexOf(results, gname.name) === -1) {
					dojo.create('div', {
						innerHTML: gname.name
					}, this.resultsContainer);
					results.push(gname.name);
				}
			}, this);
			dojo.create('span', {
				'class': 'badge badge-success',
				innerHTML: results.length
			}, this.resultsContainer, 'first');
		}

		dojo.addClass(this.loader, 'hidden');
	},
	showWarning: function (msg) {
		this.warningContainer.innerHTML = msg;
		dojo.removeClass(this.warningContainer, 'hidden');
	}
});

dojo.ready(function () {
	var app = new fhApp();
});