import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DocumentCard from '../../components/DocumentCard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function buildDoc(overrides = {}) {
  return {
    id: 'doc-uuid-1',
    name_initial: 'Juma H.',
    doc_type: 'NIDA',
    id_number_masked: '1990****001',
    region_found: 'Arusha',
    branch_name: 'Arusha Main PO',
    status: 'LOGGED',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderCard(doc) {
  return render(
    <MemoryRouter>
      <DocumentCard doc={doc} />
    </MemoryRouter>
  );
}

describe('DocumentCard', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('renders the masked name', () => {
    renderCard(buildDoc());
    expect(screen.getByText('Juma H.')).toBeInTheDocument();
  });

  it('renders the human-readable document type label', () => {
    renderCard(buildDoc({ doc_type: 'NIDA' }));
    expect(screen.getByText('NIDA Card')).toBeInTheDocument();
  });

  it('renders the masked ID number', () => {
    renderCard(buildDoc());
    expect(screen.getByText('1990****001')).toBeInTheDocument();
  });

  it('renders the region found', () => {
    renderCard(buildDoc({ region_found: 'Mwanza' }));
    expect(screen.getByText('Mwanza')).toBeInTheDocument();
  });

  it('renders the branch name', () => {
    renderCard(buildDoc());
    expect(screen.getByText('Arusha Main PO')).toBeInTheDocument();
  });

  it('shows the status badge', () => {
    renderCard(buildDoc({ status: 'VERIFIED' }));
    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
  });

  it('shows the claim button when status is LOGGED', () => {
    renderCard(buildDoc({ status: 'LOGGED' }));
    expect(screen.getByRole('button', { name: /claim/i })).toBeInTheDocument();
  });

  it('shows the claim button when status is VERIFIED', () => {
    renderCard(buildDoc({ status: 'VERIFIED' }));
    expect(screen.getByRole('button', { name: /claim/i })).toBeInTheDocument();
  });

  it('hides the claim button when status is COLLECTED', () => {
    renderCard(buildDoc({ status: 'COLLECTED' }));
    expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });

  it('navigates to /claim/:id when claim button is clicked', async () => {
    renderCard(buildDoc({ id: 'doc-uuid-1' }));
    await userEvent.click(screen.getByRole('button', { name: /claim/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/claim/doc-uuid-1');
  });

  it('shows "Today" for a document logged today', () => {
    renderCard(buildDoc({ created_at: new Date().toISOString() }));
    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});
