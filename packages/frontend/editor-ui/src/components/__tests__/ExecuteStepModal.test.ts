import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import ExecuteStepModal from '@/components/ExecuteStepModal.vue';
import { EXECUTE_STEP_MODAL_KEY, STORES } from '@/constants';
import userEvent from '@testing-library/user-event';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useParameterOverridesStore } from '@/stores/parameterOverrides.store';
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { NodeConnectionTypes } from 'n8n-workflow';

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

vi.mock('vue-router');

vi.mocked(useRouter);

const mockNode = {
	name: 'Test Node',
	parameters: {
		testBoolean: "={{ $fromAI('testBoolean', ``, 'boolean') }}",
		testParam: "={{ $fromAi('testParam',  ``, 'string') }}",
	},
};

const mockParentNode = {
	name: 'Parent Node',
};

const mockRunData = {
	data: {
		resultData: {
			runData: {
				['Test Node']: [
					{
						inputOverride: {
							[NodeConnectionTypes.AiTool]: [[{ json: { testParam: 'override' } }]],
						},
					},
				],
			},
		},
	},
};

const mockWorkflow = {
	id: 'test-workflow',
	getChildNodes: () => ['Parent Node'],
};

const renderModal = createComponentRenderer(ExecuteStepModal);
let pinia: ReturnType<typeof createTestingPinia>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let parameterOverridesStore: ReturnType<typeof useParameterOverridesStore>;
describe('ExecuteStepModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalsById: {
						[EXECUTE_STEP_MODAL_KEY]: {
							open: true,
							data: {
								nodeName: 'Test Node',
							},
						},
					},
					modalStack: [EXECUTE_STEP_MODAL_KEY],
				},
				[STORES.WORKFLOWS]: {
					workflowExecutionData: mockRunData,
				},
			},
		});
		workflowsStore = useWorkflowsStore();
		workflowsStore.getWorkflowExecution = mockRunData;
		workflowsStore.getNodeByName = vi
			.fn()
			.mockImplementation((name: string) => (name === 'Test Node' ? mockNode : mockParentNode));
		workflowsStore.getCurrentWorkflow = vi.fn().mockReturnValue(mockWorkflow);
		parameterOverridesStore = useParameterOverridesStore();
		parameterOverridesStore.clearParameterOverrides = vi.fn();
		parameterOverridesStore.addParameterOverrides = vi.fn();
		parameterOverridesStore.substituteParameters = vi.fn();
	});

	it('renders correctly with node data', () => {
		const { getByTitle } = renderModal({
			props: {
				modalName: EXECUTE_STEP_MODAL_KEY,
				data: {
					nodeName: 'Test Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		expect(getByTitle('Test Test Node')).toBeTruthy();
	});

	it('uses run data when available as initial values', async () => {
		const { getByTestId } = renderModal({
			props: {
				modalName: EXECUTE_STEP_MODAL_KEY,
				data: {
					nodeName: 'Test Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		await userEvent.click(getByTestId('execute-workflow-button'));

		expect(parameterOverridesStore.addParameterOverrides).toHaveBeenCalledWith(
			'test-workflow',
			'Test Node',
			{
				testBoolean: true,
				testParam: 'override',
			},
		);
	});

	it('clears parameter overrides when modal is executed', async () => {
		const { getByTestId } = renderModal({
			props: {
				modalName: EXECUTE_STEP_MODAL_KEY,
				data: {
					nodeName: 'Test Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		await userEvent.click(getByTestId('execute-workflow-button'));

		expect(parameterOverridesStore.clearParameterOverrides).toHaveBeenCalledWith(
			'test-workflow',
			'Test Node',
		);
	});

	it('substitutes parameters when modal is closed', async () => {
		const { getByTestId } = renderModal({
			props: {
				modalName: EXECUTE_STEP_MODAL_KEY,
				data: {
					nodeName: 'Test Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		const inputs = getByTestId('execute-step-modal-inputs');
		await userEvent.click(inputs.querySelector('input[value="testBoolean"]') as Element);
		await userEvent.clear(inputs.querySelector('input[name="testParam"]') as Element);
		await userEvent.type(inputs.querySelector('input[name="testParam"]') as Element, 'given value');
		await userEvent.click(getByTestId('execute-workflow-button'));

		expect(parameterOverridesStore.addParameterOverrides).toHaveBeenCalledWith(
			'test-workflow',
			'Test Node',
			{
				testBoolean: false,
				testParam: 'given value',
			},
		);
	});
});
