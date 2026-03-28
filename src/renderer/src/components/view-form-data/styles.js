import { css } from '@emotion/react';

export const COLORS = {
  primary: '#2e7d32',
  statsBg: '#f5f5f5',
  border: '#e0e0e0',
  hoverBg: '#fafafa',
  badgeBg: '#e8f5e9',
  dividerBg: '#f0f0f0',
  textSecondary: 'text.secondary'
};

export const SPACING = {
  xs: 0.5,
  sm: 1,
  md: 1.5,
  lg: 2,
  xl: 3
};

export const styles = {
  // Container and layout
  pageContainer: css`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  `,

  headerStack: css`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  `,

  headerTitle: css`
    flex: 1;
    font-weight: bold;
    color: #000000;
  `,

  // Loading and error states
  loadingStack: css`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  `,

  errorAlert: css`
    margin-bottom: 1.5rem;
  `,

  // Survey properties card
  propertiesCard: css`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  `,

  propertyRow: css`
    display: flex;
    gap: 0.5rem;
  `,

  // Statistics panel
  statsPanel: css`
    padding: 1rem;
    background-color: ${COLORS.statsBg};
    border-left: 4px solid ${COLORS.primary};
    border-radius: 4px;
  `,

  statsTitle: css`
    font-weight: bold;
    margin-bottom: 0.5rem;
  `,

  statsList: css`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  `,

  // Chart container
  chartContainer: css`
    width: 100%;
    height: 320px;
  `,

  chartMargin: {
    top: 10,
    right: 24,
    left: 0,
    bottom: 18
  },

  // Text responses list
  searchInput: css`
    width: 100%;
    margin-bottom: 1rem;
  `,

  responsesList: css`
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid ${COLORS.border};
    border-radius: 4px;
  `,

  responseItem: css`
    padding: 0.75rem;
    border-bottom: 1px solid ${COLORS.dividerBg};
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;

    &:hover {
      background-color: ${COLORS.hoverBg};
    }

    &:last-child {
      border-bottom: none;
    }
  `,

  countBadge: css`
    background-color: ${COLORS.badgeBg};
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    white-space: nowrap;
    font-size: 0.75rem;
  `,

  // Question card
  questionHeader: css`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  `,

  questionTitle: css`
    font-weight: 600;
  `,

  questionMeta: css`
    color: ${COLORS.textSecondary};
    font-size: 0.875rem;
  `,

  questionContent: css`
    display: flex;
    flex-direction: column;
    gap: 1rem;
  `
};
