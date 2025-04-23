import { ListInsightsWorkflowQueryDto, InsightsDateFilterDto } from '@n8n/api-types';
import type { InsightsSummary, InsightsByTime, InsightsByWorkflow } from '@n8n/api-types';

import { Get, GlobalScope, Licensed, Query, RestController } from '@/decorators';
import { AuthenticatedRequest } from '@/requests';

import { InsightsService } from './insights.service';

@RestController('/insights')
export class InsightsController {
	private readonly maxAgeInDaysFilteredInsights = 7;

	constructor(private readonly insightsService: InsightsService) {}

	getMaxAgeInDays(payload: InsightsDateFilterDto): number {
		return this.insightsService.transformDateRangeToMaxAgeInDays(payload.dateRange ?? 'week');
	}

	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(@Query payload: InsightsDateFilterDto): Promise<InsightsSummary> {
		const maxAgeInDays = this.getMaxAgeInDays(payload);
		return await this.insightsService.getInsightsSummary({
			periodLengthInDays: maxAgeInDays,
		});
	}

	@Get('/by-workflow')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByWorkflow(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListInsightsWorkflowQueryDto,
	): Promise<InsightsByWorkflow> {
		return await this.insightsService.getInsightsByWorkflow({
			maxAgeInDays: this.maxAgeInDaysFilteredInsights,
			skip: payload.skip,
			take: payload.take,
			sortBy: payload.sortBy,
		});
	}

	@Get('/by-time')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByTime(): Promise<InsightsByTime[]> {
		return await this.insightsService.getInsightsByTime({
			maxAgeInDays: this.maxAgeInDaysFilteredInsights,
			periodUnit: 'day',
		});
	}
}
