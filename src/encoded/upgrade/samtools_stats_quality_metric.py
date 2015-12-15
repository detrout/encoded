from contentbase import upgrade_step


@upgrade_step('samtools_stats_quality_metric', '1', '2')
def samtools_stats_quality_metric_1_2(value, system):
    # http://redmine.encodedcc.org/issues/3063
    if 'aliases' in value:
        value['aliases'] = list(set(value['aliases']))

    if 'quality_metric_of' in value:
        value['quality_metric_of'] = list(set(value['quality_metric_of']))
