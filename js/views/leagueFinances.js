/**
 * @name views.schedule
 * @namespace Show current schedule for user's team.
 */
define(["globals", "ui", "core/team", "lib/jquery", "lib/knockout", "lib/underscore", "util/bbgmView", "util/helpers", "util/viewHelpers", "views/components"], function (g, ui, team, $, ko, _, bbgmView, helpers, viewHelpers, components) {
    "use strict";

    var mapping;

    function get(req) {
        return {
            season: helpers.validateSeason(req.params.season)
        };
    }

    function InitViewModel() {
        this.season = ko.observable();
    }

    mapping = {
        teams: {
            create: function (options) {
                return options.data;
            }
        }
    };

    function updateLeagueFinances(inputs, updateEvents, vm) {
        if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || inputs.season !== vm.season() || inputs.season === g.season) {
            return team.filter({
                attrs: ["tid", "abbrev", "region", "name"],
                seasonAttrs: ["att", "revenue", "profit", "cash", "payroll", "salaryPaid"],
                season: inputs.season
            }).then(function (teams) {
                return {
                    season: inputs.season,
                    salaryCap: g.salaryCap / 1000,
                    minPayroll: g.minPayroll / 1000,
                    luxuryPayroll: g.luxuryPayroll / 1000,
                    luxuryTax: g.luxuryTax,
                    teams: teams
                };
            });
        }
    }

    function uiFirst(vm) {
        ko.computed(function () {
            ui.title("League Finances - " + vm.season());
        }).extend({throttle: 1});

        ko.computed(function () {
            var season;
            season = vm.season();
            ui.datatableSinglePage($("#league-finances"), 5, _.map(vm.teams(), function (t) {
                var payroll;
                payroll = season === g.season ? t.payroll : t.salaryPaid;  // Display the current actual payroll for this season, or the salary actually paid out for prior seasons
                return ['<a href="' + helpers.leagueUrl(["team_finances", t.abbrev]) + '">' + t.region + '</a>', helpers.numberWithCommas(helpers.round(t.att)), helpers.formatCurrency(t.revenue, "K"), helpers.formatCurrency(t.profit, "K"), helpers.formatCurrency(t.cash, "K"), helpers.formatCurrency(payroll, "K")];
            }));
        }).extend({throttle: 1});

        ui.tableClickableRows($("#league-finances"));
    }

    function uiEvery(updateEvents, vm) {
        components.dropdown("league-finances-dropdown", ["seasons"], [vm.season()], updateEvents);
    }

    return bbgmView.init({
        id: "leagueFinances",
        get: get,
        InitViewModel: InitViewModel,
        mapping: mapping,
        runBefore: [updateLeagueFinances],
        uiFirst: uiFirst,
        uiEvery: uiEvery
    });
});