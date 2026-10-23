async function readSelectionStageState(page) {
  return page.evaluate(() => {
    const stages = document.querySelectorAll('[data-testid="money-loop-three-stage"]');
    if (stages.length !== 1) throw new Error('Selection state requires one current stage.');
    const stage = stages[0];
    if (!(stage instanceof HTMLElement) || !stage.isConnected) throw new Error('Selection state requires a connected HTML stage.');
    const id = stage.getAttribute('data-active-artifact');
    const state = stage.getAttribute('data-selection-state');
    if (!['income', 'loc', 'expenses', 'cash-flow', 'principal'].includes(id)
      || !['settled', 'transitioning'].includes(state)) throw new Error('Selection state requires a current artifact and transition state.');
    return { id, state, revision: stage.getAttribute('data-selection-revision') };
  });
}
module.exports = { readSelectionStageState };
