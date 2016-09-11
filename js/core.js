require([
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/on',
    'dojo/request',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/domReady!'
], function (
    domClass,
    domConstruct,
    on,
    request,
    declare,
    lang
) {
    var App = declare(null, {
        // summary:
        //        Main app object

        urls: {
            states: 'http://api.geonames.org/childrenJSON',
            search: 'http://api.geonames.org/searchJSON'
        },

        // username: String
        //        My geonames.org username
        username: 'stdavis',

        // USid: String
        //        The geonameid of the US
        USid: '6252001',

        // maxRows: Number
        //        The max rows allowed back from the server
        maxRows: 500,

        // inflight_request: Promise
        inflight_request: null,


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

        // countiesContainer: div
        countiesContainer: null,

        // citiesContainer: div
        citiesContainer: null,

        // warningContainer: div
        warningContainer: null,

        // totalResults: div
        totalResults: null,

        // loader: img
        loader: null,

        // fCodes: String
        //        The feature codes for cities and counties
        fCodes: 'featureCode=PPL&featureCode=ADM2',

        constructor: function () {
            // get dom node references
            this.errorContainer = document.getElementById('error-container');
            this.errorText = document.getElementById('error-text');
            this.statesSelect = document.getElementById('states-select');
            this.startsWithBox = document.getElementById('starts-with-textbox');
            this.goBtn = document.getElementById('go-button');
            this.countiesContainer = document.getElementById('counties-container');
            this.citiesContainer = document.getElementById('cities-container');
            this.warningContainer = document.getElementById('warning-text');
            this.loader = document.getElementById('loader');
            this.totalResults = document.getElementById('total-results');

            this.wireEvents();

            this.getStates();
        },
        wireEvents: function () {
            // summary:
            //        Wires up all of the events for the page

            on(this.startsWithBox, 'keyup', lang.hitch(this, 'onGo'));
        },
        getStates: function () {
            // summary:
            //        Fires request to get all US states

            var params = {
                query: {
                    username: this.username,
                    geonameId: this.USid
                },
                handleAs: 'json',
                headers: {
                    'X-Requested-With': null
                }
            };
            request(this.urls.states, params).then(lang.hitch(this, 'loadStates'), lang.hitch(this, 'onError'));
        },
        onError: function (er) {
            // summary:
            //        handles all xhr errors
            if (er.message = 'Request canceled') {
                return;
            }

            console.error(er);

            this.errorText.innerHTML = er.message;
            domClass.remove(this.errorContainer, 'hidden');

            domClass.add(this.loader, 'hidden');
        },
        loadStates: function (response) {
            // summary:
            //        callback from getStates

            // check to make sure that there were results
            if (!response.totalResultsCount || response.totalResultsCount === 0) {
                this.onError({message: 'No States where found.'});
            } else {
                console.log(response.totalResultsCount + ' states found.');

                response.geonames.forEach(function (gname) {
                    domConstruct.create('option', {
                        value: gname.adminCode1,
                        innerHTML: gname.name
                    }, this.statesSelect);
                }, this);
            }

            domClass.add(this.loader, 'hidden');

            this.statesSelect.focus();
        },
        onGo: function () {
            // summary:
            //        Fires when the user clicks the go button
            domClass.add(this.errorContainer, 'hidden');
            this.countiesContainer.innerHTML = '';
            this.citiesContainer.innerHTML = '';
            this.totalResults.innerHTML = '';
            domClass.add(this.warningContainer, 'hidden');
            domClass.remove(this.loader, 'hidden');

            // make sure that at least one letter is in starts with
            if (this.startsWithBox.value.length === 0) {
                return;
            }

            // cancel any pending requests
            if (this.inflight_request && !this.inflight_request.isResolved()) {
                this.inflight_request.cancel();
            }

            var params = {
                query: {
                    username: this.username,
                    adminCode1: this.statesSelect.value,
                    maxRows: this.maxRows,
                    name_startsWith: this.startsWithBox.value,
                    lang: 'en'
                },
                handleAs: 'json',
                headers: {
                    'X-Requested-With': null
                }
            };
            this.inflight_request = request(this.urls.search + '?' + this.fCodes, params).then(
                lang.hitch(this, 'loadResults'),
                lang.hitch(this, 'onError')
            );
        },
        loadResults: function (response) {
            // summary:
            //        callback for the search query

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
                response.geonames.forEach(function (gname) {
                    if (dojo.indexOf(results, gname.name) === -1) {
                        var container = (gname.fcode === 'ADM2') ? 'counties-container' : 'cities-container';
                        domConstruct.create('div', {
                            innerHTML: gname.name
                        }, container);
                        results.push(gname.name);
                    }
                }, this);
                domConstruct.create('span', {
                    'class': 'badge badge-success',
                    innerHTML: results.length
                }, this.totalResults);
            }

            domClass.add(this.loader, 'hidden');
        },
        showWarning: function (msg) {
            this.warningContainer.innerHTML = msg;
            domClass.remove(this.warningContainer, 'hidden');
        }
    });

    new App();
});
