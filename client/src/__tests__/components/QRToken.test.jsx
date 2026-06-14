import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QRToken from '../../components/QRToken';

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
const QR_DATA_URL = 'data:image/png;base64,fakeqrdata';

function renderQR(overrides = {}) {
  return render(
    <QRToken
      qrDataUrl={QR_DATA_URL}
      expiresAt={FUTURE_DATE}
      amountPaid={10000}
      {...overrides}
    />
  );
}

describe('QRToken', () => {
  it('renders the "Payment Confirmed!" heading', () => {
    renderQR();
    expect(screen.getByText('Payment Confirmed!')).toBeInTheDocument();
  });

  it('renders the QR code image with the provided src', () => {
    renderQR();
    const img = screen.getByAltText('Collection QR Code');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe(QR_DATA_URL);
  });

  it('displays the amount paid formatted with locale separator', () => {
    renderQR({ amountPaid: 10000 });
    expect(screen.getByText('TZS 10,000')).toBeInTheDocument();
  });

  it('shows a "QR valid until" date', () => {
    renderQR();
    expect(screen.getByText('QR valid until')).toBeInTheDocument();
  });

  it('shows the "Print / Save" button', () => {
    renderQR();
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });

  it('calls window.print when the print button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderQR();
    await userEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('shows instructions to bring face for staff verification', () => {
    renderQR();
    expect(screen.getByText(/your face/i)).toBeInTheDocument();
  });
});
