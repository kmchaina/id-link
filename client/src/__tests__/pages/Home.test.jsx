import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Home from '../../pages/Home';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home page', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('renders the main search input', () => {
    renderHome();
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders the Search button', () => {
    renderHome();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });

  it('navigates to /search with the query when form is submitted', async () => {
    renderHome();
    await userEvent.type(screen.getByPlaceholderText(/search by name/i), 'Juma Hassan');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=Juma%20Hassan');
  });

  it('does not navigate when the search query is blank', async () => {
    renderHome();
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders the "How it works" section heading', () => {
    renderHome();
    expect(screen.getByText('How it works')).toBeInTheDocument();
  });

  it('renders all three step cards', () => {
    renderHome();
    // Step headings are h3 elements; 'Search' also appears on the submit button so query by role
    const headings = screen.getAllByRole('heading', { level: 3 });
    const headingTexts = headings.map(h => h.textContent);
    expect(headingTexts).toContain('Search');
    expect(headingTexts).toContain('Verify & Pay');
    expect(headingTexts).toContain('Collect');
  });

  it('renders the pricing section with three fee cards', () => {
    renderHome();
    expect(screen.getByText('Recovery Fee')).toBeInTheDocument();
    expect(screen.getByText('Premium Delivery')).toBeInTheDocument();
    expect(screen.getByText('Alert Subscription')).toBeInTheDocument();
  });

  it('shows the TZS 10,000 recovery fee', () => {
    renderHome();
    expect(screen.getByText('TZS 10,000')).toBeInTheDocument();
  });

  it('renders the alert CTA section', () => {
    renderHome();
    expect(screen.getByText(/Haven't found your ID yet/i)).toBeInTheDocument();
  });

  it('navigates to /search?alert=1 when the alert button is clicked', async () => {
    renderHome();
    await userEvent.click(screen.getByRole('button', { name: /set up an alert/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/search?alert=1');
  });
});
