export default function QRToken({ qrDataUrl, expiresAt, amountPaid }) {
  const expires = new Date(expiresAt).toLocaleDateString('en-TZ', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="card text-center space-y-4">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <span className="text-2xl">✅</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Payment Confirmed!</h2>
      <p className="text-sm text-gray-600">
        Show this QR code at the Post Office counter to collect your document.
        <br />
        <span className="font-medium">Bring a copy of this screen + your face — ID photo will be verified by staff.</span>
      </p>

      <div className="bg-white border-2 border-brand-800 rounded-xl p-4 inline-block mx-auto">
        <img src={qrDataUrl} alt="Collection QR Code" className="w-48 h-48" />
      </div>

      <div className="bg-brand-50 rounded-xl p-3 text-sm text-left space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Amount paid</span>
          <span className="font-semibold">TZS {amountPaid?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">QR valid until</span>
          <span className="font-semibold">{expires}</span>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Screenshot this screen. An SMS confirmation has also been sent to your phone.
      </p>

      <button onClick={() => window.print()} className="btn-secondary text-sm py-2.5">
        Print / Save
      </button>
    </div>
  );
}
