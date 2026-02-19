<script setup>
    import { RouterLink } from 'vue-router'
    import { db } from '../database.js'
</script>

<script>
    export default {
        props: {
            cards: String,
            results: String,
            deck: String,
            depth: Number,
            display: Object
        },
        data() {
            return {
                filter_cards: [],
                filter_results: [],
                filter_deck: [],
                filter_depth: 1,
                columns: {'step': true, 'result': true, 'result_stats': true, 'filter': true},
                sort: 'id',
                sort_order: 'asc',
                fusions: [],
                filtered_fusions: [],
                loading: false,
                db
            }
        },
        created()
        {
            if (this.cards != null && this.cards.length > 0)
                this.filter_cards = this.cards.split(',');

            if (this.results != null && this.results.length > 0)
                this.filter_results = this.results.split(',');

            if (this.deck != null && this.deck.length > 0)
                this.filter_deck = this.deck.split(',');

            if (this.depth != null)
                this.filter_depth = this.depth;

            if (this.filter_deck.length == 0)
                this.filter_deck = this.db.data["cards"].map(x => x["id"]);

            if (this.display != null) {
                this.columns['step'] = ('step' in this.display) ? this.display.step : true;
                this.columns['result'] = ('result' in this.display) ? this.display.result : true;
                this.columns['result_stats'] = ('result_stats' in this.display) ? this.display.result_stats : true;
                this.columns['filter'] = ('filter' in this.display) ? this.display.filter : true;
            }

            this.runFusionCalc();
        },
        watch: {
            cards(newValue, oldValue) {
                if (newValue.length > 0)
                    this.filter_cards = newValue.split(',');
                this.runFusionCalc();
            },
            deck(newValue, oldValue) {
                if (newValue != null)
                    this.filter_deck = this.deck.split(',');

                if (this.filter_deck.length == 0)
                    this.filter_deck = this.db.data["cards"].map(x => x["id"]);

                this.runFusionCalc();
            },
            results(newValue, oldValue) {
                if (newValue.length > 0)
                    this.filter_results = newValue.split(',');
                this.runFusionCalc();
            }
        },
        computed: {
            /** Deck cards sorted by how many fusion combinations they appear in (most to least). Only when deck is small (e.g. actual deck). */
            deckCardsByFusionCount() {
                if (!this.filtered_fusions || this.filtered_fusions.length === 0) return [];
                if (!this.filter_deck || this.filter_deck.length > 40) return [];
                const countBy = {};
                this.filter_deck.forEach(id => { countBy[id] = 0; });
                this.filtered_fusions.forEach(f => {
                    const id0 = f[0].id;
                    const id1 = f[1].id;
                    if (countBy[id0] !== undefined) countBy[id0]++;
                    if (id1 !== id0 && countBy[id1] !== undefined) countBy[id1]++;
                });
                return this.filter_deck
                    .map(id => ({ card: this.retrieveCard(id), count: countBy[id] || 0 }))
                    .filter(item => item.card != null)
                    .sort((a, b) => b.count - a.count);
            }
        },
        methods: {
            runFusionCalc() {
                let self = this;
                self.loading = true;

                setTimeout(function() {
                    self.fusions = [];

                    if (self.filter_cards.length > 0) {
                        self.calculateFusionByCard(self.filter_cards, self.filter_deck);
                    }

                    if (self.filter_results.length > 0) {
                        self.calculateFusionByResult(self.filter_results, self.filter_deck);
                    }

                    self.filtered_fusions = self.fusions;

                    self.refreshSort(null);

                    self.loading = false;
                    
                }, 100);
            },
            calculateFusionByCard(cards = [], deck = [], depth = 1)
            {
                let pool = [...cards]
                let card_idx = pool.pop();

                while (card_idx !== undefined)
                {
                    let deck_idx = deck.indexOf(card_idx);
                    if (deck_idx != -1) {
                        deck.splice(deck_idx, 1);
                    }

                    let card = this.retrieveCard(card_idx);

                    for (let j = 0; j < card["fusions"].length; ++j)
                    {
                        if (deck.indexOf(card["fusions"][j][0]) != -1)
                        {
                            this.fusions.push([card, this.retrieveCard(card["fusions"][j][0]), this.retrieveCard(card["fusions"][j][1]), depth]);

                            if (depth < this.filter_depth)
                            {
                                let deck_copy = [...deck];
                                deck_copy.splice(deck_copy.indexOf(card["fusions"][j][0]), 1);
                                this.calculateFusionByCard([card["fusions"][j][1]], deck_copy, depth + 1);
                            }
                        }
                    }

                    deck.push(card_idx);
                    card_idx = pool.pop();
                }
            },
            calculateFusionByResult(cards = [], deck = [])
            {
                let pool = deck.map(x => this.retrieveCard(x));

                for (let i = 0; i < cards.length; ++i)
                {
                    for (let j = 0; j < pool.length; ++j)
                    {
                        for (let k = 0; k < pool[j]["fusions"].length; ++k)
                        {
                            if (pool[j]["fusions"][k][1] == cards[i] && (deck.length == 0 || deck.indexOf(pool[j]["fusions"][k][0]) != -1))
                            {
                                this.fusions.push([pool[j], this.retrieveCard(pool[j]["fusions"][k][0]), this.retrieveCard(pool[j]["fusions"][k][1]), 1]);
                            }
                        }
                    }
                }
            },
            retrieveCard(card_id) {
                for (let i = 0; i < this.db.data["cards"].length; ++i)
                {
                    if (this.db.data["cards"][i]["id"] == card_id)
                    {
                        return this.db.data["cards"][i];
                    }
                }

                return null;
            },
            refreshSort(event) {
                if (this.filter_depth == 1)
                {
                    if (this.sort_order == "desc")
                    {
                        if (this.sort == "name") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => b[2]["name"].localeCompare(a[2]["name"]));
                        } else if (this.sort == "type") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => b[2]["type"].localeCompare(a[2]["type"]));
                        } else if (this.sort == "attack") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => b[2]["attack"] - a[2]["attack"]);
                        } else if (this.sort == "defense") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => b[2]["defense"] - a[2]["defense"]);
                        } else if (this.sort == "level") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => b[2]["level"] - a[2]["level"]);
                        } else {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => parseInt(b[2]["id"]) - parseInt(a[2]["id"])); // by id
                        }
                    }
                    else // asc
                    {
                        if (this.sort == "name") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => a[2]["name"].localeCompare(b[2]["name"]));
                        } else if (this.sort == "type") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => a[2]["type"].localeCompare(b[2]["type"]));
                        } else if (this.sort == "attack") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => a[2]["attack"] - b[2]["attack"]);
                        } else if (this.sort == "defense") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => a[2]["defense"] - b[2]["defense"]);
                        } else if (this.sort == "level") {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => a[2]["level"] - b[2]["level"]);
                        } else {
                            this.filtered_fusions = this.filtered_fusions.sort((a, b) => parseInt(a[2]["id"]) - parseInt(b[2]["id"])); // by id
                        }
                    }
                }
            }
        }
    }
</script>

<template>
    <div class="text-center" v-if="loading">
        <div class="spinner-border text-primary" role="status">
            <span class="sr-only">Loading...</span>
        </div>
    </div>
    <template v-else>
        <div class="row mt-2" v-if="fusions.length == 0">
            <div class="col-12">
                <p class="text-center lead">No fusion available</p>
            </div>
        </div>
        <template v-else>
            <div class="row mt-2 mb-3" v-if="deckCardsByFusionCount.length > 0">
                <div class="col-12">
                    <div class="card bg-dark">
                        <div class="card-header">
                            <h5 class="mb-0">Deck cards by fusion combinations</h5>
                            <p class="text-muted small mb-0 mt-1">Most to least used as material in the fusions below.</p>
                        </div>
                        <div class="card-body py-2">
                            <div class="d-flex flex-wrap gap-2">
                                <RouterLink
                                    v-for="item in deckCardsByFusionCount"
                                    :key="item.card.id"
                                    :to="{ name: 'cardDetails', params: { id: item.card.id } }"
                                    class="badge text-decoration-none"
                                    :class="item.count > 0 ? 'bg-primary' : 'bg-secondary'"
                                >
                                    {{ item.card.name }} ({{ item.count }})
                                </RouterLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row mt-2 mb-4" v-if="columns.filter">
                <div class="col-md-3 col-8 mb-2">
                    <div class="input-group">
                        <span class="input-group-text"><i class="fa fa-sort"></i></span>
                        <select class="form-select form-select-lg" v-model="sort" @change="refreshSort">
                            <option value="id">Number</option>
                            <option value="name">Name</option>
                            <option value="type">Type</option>
                            <option value="attack">Attack</option>
                            <option value="defense">Defense</option>
                            <option value="level">Level</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-2 col-4">
                    <div class="input-group">
                        <select class="form-select form-select-lg" v-model="sort_order" @change="refreshSort">
                            <option value="asc">Asc.</option>
                            <option value="desc">Desc.</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-2 col-12" v-if="columns.step">
                    <div class="input-group">
                        <span class="input-group-text"><i class="fa fa-layer-group"></i></span>
                        <select class="form-select form-select-lg" v-model="filter_depth" @change="runFusionCalc">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="row mt-2">
                <div class="col-12">
                    <table class="table table-hover table-dark table-bordered mb-0">
                        <thead>
                            <tr>
                                <td v-if="columns.step" class="text-center">Step</td>
                                <td>Fusion</td>
                                <td v-if="columns.result">Result</td>
                                <td v-if="columns.result_stats">Atk.</td>
                                <td v-if="columns.result_stats">Def.</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="fusion in filtered_fusions">
                                <td v-if="columns.step" class="text-center">{{ fusion[3] }}</td>
                                <td><RouterLink :to="{ name: 'cardDetails', params: { id: fusion[0].id }}">{{ fusion[0].name }}</RouterLink> + <RouterLink :to="{ name: 'cardDetails', params: { id: fusion[1].id }}">{{ fusion[1].name }}</RouterLink></td>
                                <td v-if="columns.result"><RouterLink :to="{ name: 'cardDetails', params: { id: fusion[2].id }}">{{ fusion[2].name }}</RouterLink></td>
                                <td v-if="columns.result_stats">{{ fusion[2].attack }}</td>
                                <td v-if="columns.result_stats">{{ fusion[2].defense }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>
    </template>
</template>