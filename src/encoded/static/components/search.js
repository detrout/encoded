'use strict';
var React = require('react');
var cloneWithProps = require('react/lib/cloneWithProps');
var Modal = require('react-bootstrap/lib/Modal');
var OverlayMixin = require('react-bootstrap/lib/OverlayMixin');
var cx = require('react/lib/cx');
var url = require('url');
var _ = require('underscore');
var globals = require('./globals');
var image = require('./image');
var search = module.exports;
var dbxref = require('./dbxref');
var audit = require('./audit');
var objectutils = require('./objectutils');

var DbxrefList = dbxref.DbxrefList;
var Dbxref = dbxref.Dbxref;
var statusOrder = globals.statusOrder;
var SingleTreatment = objectutils.SingleTreatment;
var AuditIndicators = audit.AuditIndicators;
var AuditDetail = audit.AuditDetail;
var AuditMixin = audit.AuditMixin;

    // Should really be singular...
    var types = {
        annotation: {title: 'Annotation file set'},
        antibody_lot: {title: 'Antibodies'},
        biosample: {title: 'Biosamples'},
        experiment: {title: 'Experiments'},
        target: {title: 'Targets'},
        dataset: {title: 'Datasets'},
        image: {title: 'Images'},
        matched_set: {title: 'Matched set series'},
        organism_development_series: {title: 'Organism development series'},
        publication: {title: 'Publications'},
        page: {title: 'Web page'},
        pipeline: {title: 'Pipeline'},
        project: {title: 'Project file set'},
        publication_data: {title: 'Publication file set'},
        reference: {title: 'Reference file set'},
        reference_epigenome: {title: 'Reference epigenome series'},
        replication_timing_series: {title: 'Replication timing series'},
        software: {title: 'Software'},
        treatment_concentration_series: {title: 'Treatment concentration series'},
        treatment_time_series: {title: 'Treatment time series'},
        ucsc_browser_composite: {title: 'UCSC browser composite file set'}
    };

    var datasetTypes = {
        'Annotation': types['annotation'].title,
        'Dataset': types['dataset'].title,
        'MatchedSet': types['matched_set'].title,
        'OrganismDevelopmentSeries': types['organism_development_series'].title,
        'Project': types['project'].title,
        'PublicationData': types['publication_data'].title,
        'Reference': types['reference'].title,
        'ReferenceEpigenome': types['reference_epigenome'].title,
        'ReplicationTimingSeries': types['replication_timing_series'].title,
        'TreatmentConcentrationSeries': types['treatment_concentration_series'].title,
        'TreatmentTimeSeries': types['treatment_time_series'].title,
        'UcscBrowserComposite': types['ucsc_browser_composite'].title
    };

    var Listing = module.exports.Listing = function (props) {
        // XXX not all panels have the same markup
        var context;
        if (props['@id']) {
            context = props;
            props = {context: context,  key: context['@id']};
        }
        var ListingView = globals.listing_views.lookup(props.context);
        return <ListingView {...props} />;
    };

    var PickerActionsMixin = module.exports.PickerActionsMixin = {
        contextTypes: {actions: React.PropTypes.array},
        renderActions: function() {
            if (this.context.actions && this.context.actions.length) {
                return (
                    <div className="pull-right">
                        {this.context.actions.map(action => cloneWithProps(action, {id: this.props.context['@id']}))}
                    </div>
                );
            } else {
                return <span/>;
            }
        }
    };

    var Item = module.exports.Item = React.createClass({
        mixins: [PickerActionsMixin, AuditMixin],
        render: function() {
            var result = this.props.context;
            var title = globals.listing_titles.lookup(result)({context: result});
            var item_type = result['@type'][0];
            return (
                <li>
                    <div className="clearfix">
                        {this.renderActions()}
                        {result.accession ?
                            <div className="pull-right type sentence-case search-meta">
                                <p>{item_type}: {' ' + result['accession']}</p>
                                <AuditIndicators audits={result.audit} id={this.props.context['@id']} search />
                            </div>
                        : null}
                        <div className="accession">
                            <a href={result['@id']}>{title}</a>
                        </div>
                        <div className="data-row">
                            {result.description}
                        </div>
                    </div>
                    <AuditDetail context={result} id={this.props.context['@id']} forcedEditLink />
                </li>
            );
        }
    });
    globals.listing_views.register(Item, 'Item');

    // Display one antibody status indicator
    var StatusIndicator = React.createClass({
        getInitialState: function() {
            return {
                tipOpen: false,
                tipStyles: {}
            };
        },

        // Display tooltip on hover
        onMouseEnter: function () {
            function getNextElementSibling(el) {
                // IE8 doesn't support nextElementSibling
                return el.nextElementSibling ? el.nextElementSibling : el.nextSibling;
            }

            // Get viewport bounds of result table and of this tooltip
            var whiteSpace = 'nowrap';
            var resultBounds = document.getElementById('result-table').getBoundingClientRect();
            var resultWidth = resultBounds.right - resultBounds.left;
            var tipBounds = _.clone(getNextElementSibling(this.refs.indicator.getDOMNode()).getBoundingClientRect());
            var tipWidth = tipBounds.right - tipBounds.left;
            var width = tipWidth;
            if (tipWidth > resultWidth) {
                // Tooltip wider than result table; set tooltip to result table width and allow text to wrap
                tipBounds.right = tipBounds.left + resultWidth - 2;
                whiteSpace = 'normal';
                width = tipBounds.right - tipBounds.left - 2;
            }

            // Set an inline style to move the tooltip if it runs off right edge of result table
            var leftOffset = resultBounds.right - tipBounds.right;
            if (leftOffset < 0) {
                // Tooltip goes outside right edge of result table; move it to the left
                this.setState({tipStyles: {left: (leftOffset + 10) + 'px', maxWidth: resultWidth + 'px', whiteSpace: whiteSpace, width: width + 'px'}});
            } else {
                // Tooltip fits inside result table; move it to native position
                this.setState({tipStyles: {left: '10px', maxWidth: resultWidth + 'px', whiteSpace: whiteSpace, width: width + 'px'}});
            }

            this.setState({tipOpen: true});
        },

        // Close tooltip when not hovering
        onMouseLeave: function() {
            this.setState({tipStyles: {maxWidth: 'none', whiteSpace: 'nowrap', width: 'auto', left: '15px'}}); // Reset position and width
            this.setState({tipOpen: false});
        },

        render: function() {
            var classes = {tooltipopen: this.state.tipOpen};

            return (
                <span className="tooltip-status-trigger">
                    <i className={globals.statusClass(this.props.status, 'indicator icon icon-circle')} ref="indicator" onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}></i>
                    <div className={"tooltip-status sentence-case " + cx(classes)} style={this.state.tipStyles}>
                        {this.props.status}<br /><span>{this.props.terms.join(', ')}</span>
                    </div>
                </span>
            );
        }
    });

    // Display the status indicators for one target
    var StatusIndicators = React.createClass({
        render: function() {
            var targetTree = this.props.targetTree;
            var target = this.props.target;

            return (
                <span className="status-indicators">
                    {Object.keys(targetTree[target]).map(function(status, i) {
                        if (status !== 'target') {
                            return <StatusIndicator key={i} status={status} terms={targetTree[target][status]} />;
                        } else {
                            return null;
                        }
                    })}
                </span>
            );
        }
    });

    var Antibody = module.exports.Antibody = React.createClass({
        mixins: [PickerActionsMixin, AuditMixin],
        render: function() {
            var result = this.props.context;

            // Sort the lot reviews by their status according to our predefined order
            // given in the statusOrder array.
            var lot_reviews = _.sortBy(result.lot_reviews, function(lot_review) {
                return _.indexOf(statusOrder, lot_review.status); // Use underscore indexOf so that this works in IE8
            });

            // Build antibody display object as a hierarchy: target=>status=>biosample_term_names
            var targetTree = {};
            lot_reviews.forEach(function(lot_review) {
                lot_review.targets.forEach(function(target) {
                    // If we haven't seen this target, save it in targetTree along with the
                    // corresponding target and organism structures.
                    if (!targetTree[target.name]) {
                        targetTree[target.name] = {target: target};
                    }
                    var targetNode = targetTree[target.name];

                    // If we haven't seen the status, save it in the targetTree target
                    if (!targetNode[lot_review.status]) {
                        targetNode[lot_review.status] = [];
                    }
                    var statusNode = targetNode[lot_review.status];

                    // If we haven't seen the biosample term name, save it in the targetTree target status
                    if (statusNode.indexOf(lot_review.biosample_term_name) === -1) {
                        statusNode.push(lot_review.biosample_term_name);
                    }
                });
            });
            lot_reviews = null; // Tell GC we're done, just to be sure

            return (
                <li>
                    <div className="clearfix">
                        {this.renderActions()}
                        <div className="pull-right search-meta">
                            <p className="type meta-title">Antibody</p>
                            <p className="type">{' ' + result.accession}</p>
                            <AuditIndicators audits={result.audit} id={this.props.context['@id']} search />
                        </div>
                        <div className="accession">
                            {Object.keys(targetTree).map(function(target) {
                                return (
                                    <div key={target}>
                                        <a href={result['@id']}>
                                            {targetTree[target].target.label}
                                            {targetTree[target].target.organism ? <span>{' ('}<i>{targetTree[target].target.organism.scientific_name}</i>{')'}</span> : ''}
                                        </a>
                                        <StatusIndicators targetTree={targetTree} target={target} />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="data-row">
                            <div><strong>Source: </strong>{result.source.title}</div>
                            <div><strong>Product ID / Lot ID: </strong>{result.product_id} / {result.lot_id}</div>
                        </div>
                    </div>
                    <AuditDetail context={result} id={this.props.context['@id']} forcedEditLink />
                </li>
            );
        }
    });
    globals.listing_views.register(Antibody, 'AntibodyLot');

    var Biosample = module.exports.Biosample = React.createClass({
        mixins: [PickerActionsMixin, AuditMixin],
        render: function() {
            var result = this.props.context;
            var lifeStage = (result['life_stage'] && result['life_stage'] != 'unknown') ? ' ' + result['life_stage'] : '';
            var age = (result['age'] && result['age'] != 'unknown') ? ' ' + result['age'] : '';
            var ageUnits = (result['age_units'] && result['age_units'] != 'unknown' && age) ? ' ' + result['age_units'] : '';
            var separator = (lifeStage || age) ? ',' : '';
            var rnais = (result.rnais[0] && result.rnais[0].target && result.rnais[0].target.label) ? result.rnais[0].target.label : '';
            var constructs;
            if (result.model_organism_donor_constructs && result.model_organism_donor_constructs.length) {
                constructs = result.model_organism_donor_constructs[0].target.label;
            } else {
                constructs = result.constructs[0] ? result.constructs[0].target.label : '';
            }
            var treatment = (result.treatments[0] && result.treatments[0].treatment_term_name) ? result.treatments[0].treatment_term_name : '';
            var mutatedGenes = result.donor && result.donor.mutated_gene && result.donor.mutated_gene.label;

            // Build the text of the synchronization string
            var synchText;
            if (result.synchronization) {
                synchText = result.synchronization +
                    (result.post_synchronization_time ?
                        ' + ' + result.post_synchronization_time + (result.post_synchronization_time_units ? ' ' + result.post_synchronization_time_units : '')
                    : '');
            }

            return (
                <li>
                    <div className="clearfix">
                        {this.renderActions()}
                        <div className="pull-right search-meta">
                            <p className="type meta-title">Biosample</p>
                            <p className="type">{' ' + result['accession']}</p>
                            <p className="type meta-status">{' ' + result['status']}</p>
                            <AuditIndicators audits={result.audit} id={this.props.context['@id']} search />
                        </div>
                        <div className="accession">
                            <a href={result['@id']}>
                                {result['biosample_term_name'] + ' ('}
                                <em>{result.organism.scientific_name}</em>
                                {separator + lifeStage + age + ageUnits + ')'}
                            </a>
                        </div>
                        <div className="data-row">
                            <div><strong>Type: </strong>{result['biosample_type']}</div>
                            {rnais ?<div><strong>RNAi target: </strong>{rnais}</div> : null}
                            {constructs ? <div><strong>Construct: </strong>{constructs}</div> : null}
                            {treatment ? <div><strong>Treatment: </strong>{treatment}</div> : null}
                            {mutatedGenes ? <div><strong>Mutated gene: </strong>{mutatedGenes}</div> : null}
                            {result.culture_harvest_date ? <div><strong>Culture harvest date: </strong>{result.culture_harvest_date}</div> : null}
                            {result.date_obtained ? <div><strong>Date obtained: </strong>{result.date_obtained}</div> : null}
                            {synchText ? <div><strong>Synchronization timepoint: </strong>{synchText}</div> : null}
                            <div><strong>Source: </strong>{result.source.title}</div>
                        </div>
                    </div>
                    <AuditDetail context={result} id={this.props.context['@id']} forcedEditLink />
                </li>
            );
        }
    });
    globals.listing_views.register(Biosample, 'Biosample');


    var Experiment = module.exports.Experiment = React.createClass({
        mixins: [PickerActionsMixin, AuditMixin],
        render: function() {
            var result = this.props.context;

            // Make array of scientific names from replicates; remove all duplicates
            var names = _.uniq(result.replicates.map(function(replicate) {
                return (replicate.library && replicate.library.biosample && replicate.library.biosample.organism &&
                        replicate.library.biosample.organism) ? replicate.library.biosample.organism.scientific_name : undefined;
            }));
            var name = (names.length === 1 && names[0] && names[0] !== 'unknown') ? names[0] : '';

            // Make array of life stages from replicates; remove all duplicates
            var lifeStages = _.uniq(result.replicates.map(function(replicate) {
                return (replicate.library && replicate.library.biosample) ? replicate.library.biosample.life_stage : undefined;
            }));
            var lifeStage = (lifeStages.length === 1 && lifeStages[0] && lifeStages[0] !== 'unknown') ? ' ' + lifeStages[0] : '';

            // Make array of ages from replicates; remove all duplicates
            var ages = _.uniq(result.replicates.map(function(replicate) {
                return (replicate.library && replicate.library.biosample) ? replicate.library.biosample.age : undefined;
            }));
            var age = (ages.length === 1 && ages[0] && ages[0] !== 'unknown') ? ' ' + ages[0] : '';

            // Collect synchronizations
            var synchronizations = _.uniq(result.replicates.filter(function(replicate) {
                return (replicate.library && replicate.library.biosample && replicate.library.biosample.synchronization);
            }).map(function(replicate) {
                var biosample = replicate.library.biosample;
                return (biosample.synchronization +
                    (biosample.post_synchronization_time ?
                        ' + ' + biosample.post_synchronization_time + (biosample.post_synchronization_time_units ? ' ' + biosample.post_synchronization_time_units : '')
                    : ''));
            }));

            // Make array of age units from replicates; remove all duplicates
            var ageUnit = '';
            if (age) {
                var ageUnits = _.uniq(result.replicates.map(function(replicate) {
                    return (replicate.library && replicate.library.biosample) ? replicate.library.biosample.age_units : undefined;
                }));
                ageUnit = (ageUnits.length === 1 && ageUnits[0] && ageUnits[0] !== 'unknown') ? ' ' + ageUnits[0] : '';
            }

            // If we have life stage or age, need to separate from scientific name with comma
            var separator = (lifeStage || age) ? ', ' : '';

            // Get the first treatment if it's there
            var treatment = (result.replicates[0] && result.replicates[0].library && result.replicates[0].library.biosample &&
                    result.replicates[0].library.biosample.treatments[0]) ? SingleTreatment(result.replicates[0].library.biosample.treatments[0]) : '';

            return (
                <li>
                    <div className="clearfix">
                        {this.renderActions()}
                        <div className="pull-right search-meta">
                            <p className="type meta-title">Experiment</p>
                            <p className="type">{' ' + result['accession']}</p>
                            <p className="type meta-status">{' ' + result['status']}</p>
                            <AuditIndicators audits={result.audit} id={this.props.context['@id']} search />
                        </div>
                        <div className="accession">
                            <a href={result['@id']}>
                                {result['assay_term_name']}<span>{result['biosample_term_name'] ? ' of ' + result['biosample_term_name'] : ''}</span>
                                {name || lifeStage || age || ageUnit ?
                                    <span>
                                        {' ('}
                                        {name ? <em>{name}</em> : ''}
                                        {separator + lifeStage + age + ageUnit + ')'}
                                    </span>
                                : ''}
                            </a>
                        </div>
                        <div className="data-row">
                            {result.target && result.target.label ?
                                <div><strong>Target: </strong>{result.target.label}</div>
                            : null}

                            {treatment ?
                                <div><strong>Treatment: </strong>{treatment}</div>
                            : null}

                            {synchronizations && synchronizations.length ?
                                <div><strong>Synchronization timepoint: </strong>{synchronizations.join(', ')}</div>
                            : null}

                            <div><strong>Lab: </strong>{result.lab.title}</div>
                            <div><strong>Project: </strong>{result.award.project}</div>
                        </div>
                    </div>
                    <AuditDetail context={result} id={this.props.context['@id']} forcedEditLink />
                </li>
            );
        }
    });
    globals.listing_views.register(Experiment, 'Experiment');

    var Dataset = module.exports.Dataset = React.createClass({
        mixins: [PickerActionsMixin, AuditMixin],
        render: function() {
            var result = this.props.context;
            var biosampleTerm, organism, lifeSpec, targets, lifeStages = [], ages = [];

            // Determine whether the dataset is a series or not
            var seriesDataset = result['@type'].indexOf('Series') >= 0;

            // Get the biosample info for Series types if any. Can be string or array. If array, only use iff 1 term name exists
            if (seriesDataset) {
                biosampleTerm = (result.biosample_term_name && typeof result.biosample_term_name === 'object' && result.biosample_term_name.length === 1) ? result.biosample_term_name[0] :
                    ((result.biosample_term_name && typeof result.biosample_term_name === 'string') ? result.biosample_term_name : '');
                var organisms = _.uniq(result.organism && result.organism.length && result.organism.map(function(organism) {
                    return organism.scientific_name;
                }));
                if (organisms.length === 1) {
                    organism = organisms[0];
                }

                // Dig through the biosample life stages and ages
                if (result.related_datasets && result.related_datasets.length) {
                    result.related_datasets.forEach(function(dataset) {
                        if (dataset.replicates && dataset.replicates.length) {
                            dataset.replicates.forEach(function(replicate) {
                                if (replicate.library && replicate.library.biosample) {
                                    var biosample = replicate.library.biosample;
                                    var lifeStage = (biosample.life_stage && biosample.life_stage !== 'unknown') ? biosample.life_stage : '';

                                    if (lifeStage) { lifeStages.push(lifeStage); }
                                    if (biosample.age_display) { ages.push(biosample.age_display); }
                                }
                            });
                        }
                    });
                    lifeStages = _.uniq(lifeStages);
                    ages = _.uniq(ages);
                }
                lifeSpec = _.compact([lifeStages.length === 1 ? lifeStages[0] : null, ages.length === 1 ? ages[0] : null]);

                // Get list of target labels
                if (result.target) {
                    targets = _.uniq(result.target.map(function(target) {
                        return target.label;
                    }));
                }
            }

            var haveSeries = result['@type'].indexOf('Series') >= 0;
            var haveFileSet = result['@type'].indexOf('FileSet') >= 0;

            return (
                <li>
                    <div className="clearfix">
                        {this.renderActions()}
                        <div className="pull-right search-meta">
                            <p className="type meta-title">{haveSeries ? 'Series' : (haveFileSet ? 'FileSet' : 'Dataset')}</p>
                            <p className="type">{' ' + result['accession']}</p>
                            <p className="type meta-status">{' ' + result['status']}</p>
                            <AuditIndicators audits={result.audit} id={this.props.context['@id']} search />
                        </div>
                        <div className="accession">
                            <a href={result['@id']}>
                                {datasetTypes[result['@type'][0]]}
                                {seriesDataset ?
                                    <span>
                                        {biosampleTerm ? <span>{' in ' + biosampleTerm}</span> : null}
                                        {organism || lifeSpec.length > 0 ?
                                            <span>
                                                {' ('}
                                                {organism ? <i>{organism}</i> : null}
                                                {lifeSpec.length > 0 ? <span>{organism ? ', ' : ''}{lifeSpec.join(', ')}</span> : null}
                                                {')'}
                                            </span>
                                        : null}
                                    </span>
                                :
                                    <span>{result.description ? <span>{': ' + result.description}</span> : null}</span>
                                }
                            </a>
                        </div>
                        <div className="data-row">
                            {result['dataset_type'] ? <div><strong>Dataset type: </strong>{result['dataset_type']}</div> : null}
                            {targets && targets.length ? <div><strong>Targets: </strong>{targets.join(', ')}</div> : null}
                            <div><strong>Lab: </strong>{result.lab.title}</div>
                            <div><strong>Project: </strong>{result.award.project}</div>
                        </div>
                    </div>
                    <AuditDetail context={result} id={this.props.context['@id']} forcedEditLink />
                </li>
            );
        }
    });
    globals.listing_views.register(Dataset, 'Dataset');

    var Target = module.exports.Target = React.createClass({
        mixins: [PickerActionsMixin, AuditMixin],
        render: function() {
            var result = this.props.context;
            return (
                <li>
                    <div className="clearfix">
                        {this.renderActions()}
                        <div className="pull-right search-meta">
                            <p className="type meta-title">Target</p>
                            <AuditIndicators audits={result.audit} id={this.props.context['@id']} search />
                        </div>
                        <div className="accession">
                            <a href={result['@id']}>
                                {result['label']}
                                {result.organism && result.organism.scientific_name ? <em>{' (' + result.organism.scientific_name + ')'}</em> : null}
                            </a>
                        </div>
                        <div className="data-row">
                            <strong>External resources: </strong>
                            {result.dbxref && result.dbxref.length ?
                                <DbxrefList values={result.dbxref} target_gene={result.gene_name} />
                            : <em>None submitted</em> }
                        </div>
                    </div>
                    <AuditDetail context={result} id={this.props.context['@id']} forcedEditLink />
                </li>
            );
        }
    });
    globals.listing_views.register(Target, 'Target');


    var Image = module.exports.Image = React.createClass({
        mixins: [PickerActionsMixin, ],
        render: function() {
            var result = this.props.context;
            var Attachment = image.Attachment;
            return (
                <li>
                    <div className="clearfix">
                        {this.renderActions()}
                        <div className="pull-right search-meta">
                            <p className="type meta-title">Image</p>
                            <AuditIndicators audits={result.audit} id={this.props.context['@id']} search />
                        </div>
                        <div className="accession">
                            <a href={result['@id']}>{result.caption}</a>
                        </div>
                        <div className="data-row">
                            <Attachment context={result} />
                        </div>
                    </div>
                    <AuditDetail context={result} id={this.props.context['@id']} forcedEditLink />
                </li>
            );
        }
    });
    globals.listing_views.register(Image, 'Image');


    // If the given term is selected, return the href for the term. This usually returns to the
    // deselected state of this term.
    function termSelected(term, field, filters) {
        var matchedFilter = _(filters).find(filter => filter.field === field && filter.term === term);
        console.log('TERM: %s, field: %s, filters %o', term, field, filters);
        if (matchedFilter) {
            console.log('MATCHED: %o', matchedFilter);
        }
        return matchedFilter ? url.parse(matchedFilter.remove).search : null;
    }

    // Determine whether any of the given terms are selected
    function countSelectedTerms(terms, field, filters) {
        var count = 0;
        for(var oneTerm in terms) {
            if(termSelected(terms[oneTerm].key, field, filters)) {
                count++;
            }
        }
        return count;
    }

    // Display a subfacet of a parent term.
    var SubTerm = search.SubTerm = React.createClass({
        render: function() {
            var {facet, filters} = this.props;
            var terms = facet.terms.filter(term => term.doc_count > 0 || _(filters).any(filter => filter.term === term.key));

            return (
                <ul className="facet-list nav">
                    <div>
                        {terms.map(term => <Term key={term.key} term={term} filters={filters} total={facet.total} facet={facet} searchBase={this.props.searchBase} subterm />)}
                    </div>
                </ul>
            );
        }
    });

    var Term = search.Term = React.createClass({
        propTypes: {
            term: React.PropTypes.object.isRequired, // Info on term to display
            filters: React.PropTypes.array, // Filtering information
            facet: React.PropTypes.object, // Facet this term appears in
            subfacet: React.PropTypes.object, // Subfacet of this term
            total: React.PropTypes.number, // Total number of objects with this term
            subterm: React.PropTypes.bool, // True if displaying a term within a subfacet
            searchBase: React.PropTypes.string // Search string we're adding to to form the href
        },

        render: function () {
            var filters = this.props.filters;
            var term = this.props.term['key'];
            var count = this.props.term['doc_count'];
            var title = this.props.title || term;
            var field = this.props.facet['field'];
            var subfacet = this.props.subfacet;
            var em = field === 'target.organism.scientific_name' ||
                     field === 'organism.scientific_name' ||
                     field === 'replicates.library.biosample.donor.organism.scientific_name';
            var barStyle = {
                width:  Math.ceil( (count/this.props.total) * 100) + "%"
            };
            var selected = termSelected(term, field, filters);
            var href;
            if (selected && !this.props.canDeselect) {
                href = null;
            } else if (selected) {
                href = selected;
            } else {
                href = this.props.searchBase + field + '=' + encodeURIComponent(term).replace(/%20/g, '+')
            }
            return (
                <li id={selected ? "selected" : null} key={term}>
                    {selected ? '' : <span className="bar" style={barStyle}></span>}
                    {field === 'lot_reviews.status' ? <span className={globals.statusClass(term, 'indicator pull-left facet-term-key icon icon-circle')}></span> : null}
                    <a id={selected ? "selected" : null} href={href} onClick={href ? this.props.onFilter : null}>
                        <span className="pull-right">{count} {selected && this.props.canDeselect ? <i className="icon icon-times-circle-o"></i> : ''}</span>
                        <span className="facet-item">
                            {em ? <em>{title}</em> : <span>{title}</span>}
                        </span>
                    </a>
                    {subfacet ?
                        <SubTerm {...this.props} facet={subfacet} filters={filters} searchBase={href ? href + '&' : href + '?'} />
                    : null}
                </li>
            );
        }
    });

    var TypeTerm = search.TypeTerm = React.createClass({
        render: function () {
            var term = this.props.term['key'];
            var filters = this.props.filters;
            var title;
            try {
                title = types[term];
            } catch (e) {
                title = term;
            }
            var total = this.props.total;
            return <Term {...this.props} title={title} subfacet={this.props.subfacet} filters={filters} total={total} />;
        }
    });


    var Facet = search.Facet = React.createClass({
        getDefaultProps: function() {
            return {width: 'inherit'};
        },

        render: function() {
            var {facet, filters, context, facets} = this.props;
            var targetNameFacet;
            var hideTypeFacet = false; // True if we need to hide the 'Data type' facet.

            // Get array of all terms from facets whose doc_count > 0. Include terms whose keys are specified in a filter's term
            // regardless of their doc_count.
            var terms = facet.terms.filter(term => term.doc_count > 0 || _(filters).any(filter => filter.term === term.key));

            // If this is the 'Data type' facet, decide if we have to hide it or not
            if (facet.field === 'type') {
                // Hide the facet if all the terms' doc_count values are the same, or if there's only one term
                if (terms.length <= 1) {
                    hideTypeFacet = true;
                } else {
                    var firstDocCount = terms[0].doc_count;
                    hideTypeFacet = _(terms).all(term => term.doc_count === firstDocCount);
                }
            }

            // Subfacet detection
            var subfacets = {};
            var termHierarchy = {};
            if (facet.field === 'target.investigated_as') {
                // target.investigated_as => target.name
                // Search through all experiments matching the current search that has target.investigated_as
                context['@graph'].forEach(item => {
                    if (_(item['@type']).any(type => type === 'Experiment')) {
                        // Now we have an object (item) of type Experiment. 
                        if (item.target && item.target.investigated_as && item.target.investigated_as.length && item.target.name) {
                            item.target.investigated_as.forEach(target => {
                                if (termHierarchy[target]) {
                                    termHierarchy[target].push(item.target.name);
                                } else {
                                    termHierarchy[target] = [item.target.name];
                                }
                            });
                        }
                    }
                });

                // Remove duplicate items in each target's array of names
                Object.keys(termHierarchy).forEach(target => {
                    termHierarchy[target] = _.uniq(termHierarchy[target]);
                });

                // termHierarchy now has a key for each target.investigated_as containing an array of target.name that applies to it.
                // Assemble the subfacet object for each term. subfacets will be keyed by 'target.name'

                // First find 'target.name' facet entry so we can get the doc_count for each item
                targetNameFacet = _(facets).find(facet => facet.field === 'target.name');
                if (targetNameFacet) {
                    // For each target.investigated_as term, build a subfacet
                    facet.terms.forEach(term => {
                        if (termHierarchy[term.key]) {
                            termHierarchy[term.key].forEach(name => {
                                var subfacetTerm = _(targetNameFacet.terms).find(term => term.key === name);
                                if (subfacetTerm) {
                                    if (subfacets[term.key]) {
                                        subfacets[term.key].push(subfacetTerm);
                                    } else {
                                        subfacets[term.key] = [subfacetTerm];
                                    }
                                }
                            });
                        }
                    });
                }
            }

            if (!hideTypeFacet) {
                var {title, field, total} = facet;
                var termID = title.replace(/\s+/g, '');
                var moreTerms = terms.slice(5);
                var TermComponent = field === 'type' ? TypeTerm : Term;
                var selectedTermCount = countSelectedTerms(moreTerms, field, filters);
                var moreTermSelected = selectedTermCount > 0;
                var canDeselect = (!facet.restrictions || selectedTermCount >= 2);
                return (
                    <div className="facet" hidden={terms.length === 0} style={{width: this.props.width}}>
                        <h5>{title}</h5>
                        <ul className="facet-list nav">
                            <div>
                                {terms.map(term => {
                                    var subfacet = {};
                                    if (facet.field === 'target.investigated_as' && subfacets[term.key]) {
                                        subfacet.field = targetNameFacet.field;
                                        subfacet.terms = subfacets[term.key];
                                        subfacet.title = targetNameFacet.title;
                                        subfacet.total = targetNameFacet.total;
                                    } else{
                                        subfacet = null;
                                    }
                                    return <TermComponent key={term.key} term={term} facet={this.props.facet} subfacet={subfacet} filters={filters} total={total} canDeselect={canDeselect} searchBase={this.props.searchBase} />;
                                })}
                            </div>
                        </ul>
                    </div>
                );
            }
            return null;
        }
    });

    var TextFilter = search.TextFilter = React.createClass({

        getValue: function(props) {
            var filter = this.props.filters.filter(function(f) {
                return f.field == 'searchTerm';
            });
            return filter.length ? filter[0].term : '';
        },

        shouldUpdateComponent: function(nextProps) {
            return (this.getValue(this.props) != this.getValue(nextProps));
        },

        render: function() {
            return (
                <div className="facet">
                    <input ref="input" type="search" className="form-control search-query"
                           placeholder="Enter search term(s)"
                           defaultValue={this.getValue(this.props)}
                           onChange={this.onChange} onBlur={this.onBlur} onKeyDown={this.onKeyDown} />
                </div>
            );
        },

        onChange: function(e) {
            e.stopPropagation();
            e.preventDefault();
        },

        onBlur: function(e) {
            var search = this.props.searchBase.replace(/&?searchTerm=[^&]*/, '');
            var value = e.target.value;
            if (value) {
                search += 'searchTerm=' + e.target.value;
            } else {
                search = search.substring(0, search.length - 1);
            }
            this.props.onChange(search);
        },

        onKeyDown: function(e) {
            if (e.keyCode == 13) {
                this.onBlur(e);
                e.preventDefault();
            }
        }
    });

    var FacetList = search.FacetList = React.createClass({
        getDefaultProps: function() {
            return {orientation: 'vertical'};
        },

        render: function() {
            var term = this.props.term;
            var facets = this.props.facets;
            var filters = this.props.filters;
            var width = 'inherit';
            if (!facets.length && this.props.mode != 'picker') return <div />;
            if (this.props.orientation == 'horizontal') {
                width = (100 / facets.length) + '%';
            }
            return (
                <div className={"box facets " + this.props.orientation}>
                    {this.props.mode === 'picker' && !this.props.hideTextFilter ? <TextFilter {...this.props} filters={filters} /> : ''}
                    {facets.map(facet =>
                        <Facet {...this.props} key={facet.field} facet={facet} filters={filters}
                                  width={width} />
                    )}
                </div>
            );
        }
    });

    var BatchDownload = search.BatchDownload = React.createClass({
        mixins: [OverlayMixin],

        getInitialState: function () {
            return {
              isModalOpen: false
            };
          },

          handleToggle: function () {
            this.setState({
              isModalOpen: !this.state.isModalOpen
            });
          },

          render: function () {
            return (
                <a className="btn btn-info btn-sm" onClick={this.handleToggle}>Download</a>
            );
          },

          renderOverlay: function () {
            var link = this.props.context['batch_download'];
            if (!this.state.isModalOpen) {
              return <span/>;
            }
            return (
                <Modal title="Using batch download" onRequestHide={this.handleToggle}>
                  <div className="modal-body">
                    <p>Click the "Download" button below to download a "files.txt" file that contains a list of URLs to a file containing all the experimental metadata and links to download the file.
                    The first line of the file will always be the URL to download the metadata file. <br />
                    Further description of the contents of the metadata file are described in the <a href="/help/batch-download/">Batch Download help doc</a>.</p><br />

                    <p>The "files.txt" file can be copied to any server.<br />
                    The following command using cURL can be used to download all the files in the list:</p><br />
                    <code>xargs -n 1 curl -O -L &lt; files.txt</code><br />
                  </div>
                  <div className="modal-footer">
                        <a className="btn btn-info btn-sm" onClick={this.handleToggle}>Close</a>
                        <a data-bypass="true" target="_self" private-browsing="true" className="btn btn-info btn-sm"
                            href={link}>{'Download'}</a>
                  </div>
                </Modal>
              );
          }
    });

    var ResultTable = search.ResultTable = React.createClass({

        getDefaultProps: function() {
            return {
                restrictions: {},
                searchBase: ''
            };
        },

        childContextTypes: {actions: React.PropTypes.array},
        getChildContext: function() {
            return {
                actions: this.props.actions
            };
        },

        render: function() {
            var context = this.props.context;
            var results = context['@graph'];
            var total = context['total'];
            var batch_hub_disabled = total > 500;
            var columns = context['columns'];
            var filters = context['filters'];
            var label = 'results';
            var searchBase = this.props.searchBase;
            var trimmedSearchBase = searchBase.replace(/[\?|\&]limit=all/, "");

            var facets = context['facets'].map(function(facet) {
                if (this.props.restrictions[facet.field] !== undefined) {
                    facet = _.clone(facet);
                    facet.restrictions = this.props.restrictions[facet.field];
                    facet.terms = facet.terms.filter(term => _.contains(facet.restrictions, term.key));
                }
                return facet;
            }.bind(this));

            // See if a specific result type was requested ('type=x')
            // Satisfied iff exactly one type is in the search
            if (results.length) {
                var specificFilter;
                filters.forEach(function(filter) {
                    if (filter.field === 'type') {
                        specificFilter = specificFilter ? '' : filter.term;
                    }
                });
            }

            return (
                    <div>
                        <div className="row">
                            {facets.length ? <div className="col-sm-5 col-md-4 col-lg-3">
                                <FacetList {...this.props} facets={facets} filters={filters}
                                           searchBase={searchBase ? searchBase + '&' : searchBase + '?'} onFilter={this.onFilter} />
                            </div> : ''}
                            <div className="col-sm-7 col-md-8 col-lg-9">
                                {context['notification'] === 'Success' ?
                                    <h4>
                                        Showing {results.length} of {total} {label}
                                        {total > results.length && searchBase.indexOf('limit=all') === -1 ?
                                            <span className="pull-right">
                                                <a rel="nofollow" className="btn btn-info btn-sm"
                                                     href={searchBase ? searchBase + '&limit=all' : '?limit=all'}
                                                     onClick={this.onFilter}>View All</a>
                                            </span>
                                        :
                                            <span>
                                                {results.length > 25 ?
                                                    <span className="pull-right">
                                                        <a className="btn btn-info btn-sm"
                                                           href={trimmedSearchBase ? trimmedSearchBase : "/search/"}
                                                           onClick={this.onFilter}>View 25</a>
                                                    </span>
                                                : null}
                                            </span>
                                        }

                                        {context['batch_download'] ?
                                            <span className="pull-right">
                                                <BatchDownload context={context} />&nbsp;
                                            </span>
                                        : null}

                                        {context['batch_hub'] ?
                                            <span className="pull-right">
                                                <a disabled={batch_hub_disabled} data-bypass="true" target="_blank" private-browsing="true" className="btn btn-info btn-sm"
                                                   href={context['batch_hub']}>{batch_hub_disabled ? 'Filter to 500 to visualize' :'Visualize'}</a>&nbsp;
                                            </span>
                                        :null}
                                    </h4>
                                :
                                    <h4>{context['notification']}</h4>
                                }
                                <hr />
                                <ul className="nav result-table" id="result-table">
                                    {results.length ?
                                        results.map(function (result) {
                                            return Listing({context:result, columns: columns, key: result['@id']});
                                        })
                                    : null}
                                </ul>
                            </div>
                        </div>
                    </div>
            );
        },

        onFilter: function(e) {
            var search = e.currentTarget.getAttribute('href');
            this.props.onChange(search);
            e.stopPropagation();
            e.preventDefault();
        }
    });

    var Search = search.Search = React.createClass({
        contextTypes: {
            location_href: React.PropTypes.string,
            navigate: React.PropTypes.func
        },

        render: function() {
            var context = this.props.context;
            var results = context['@graph'];
            var notification = context['notification'];
            var searchBase = url.parse(this.context.location_href).search || '';
            var facetdisplay = context.facets && context.facets.some(function(facet) {
                return facet.total > 0;
            });
            return (
                <div>
                    {facetdisplay ?
                        <div className="panel data-display main-panel">
                            <ResultTable {...this.props} key={undefined} searchBase={searchBase} onChange={this.context.navigate} />
                        </div>
                    : <h4>{notification}</h4>}
                </div>
            );
        }
    });

    globals.content_views.register(Search, 'Search');
