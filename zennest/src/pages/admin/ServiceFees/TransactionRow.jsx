// src/pages/admin/ServiceFees/TransactionRow.jsx

const TransactionRow = ({ transaction }) => {
  const date = transaction.date ? new Date(transaction.date) : null;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">
        {date ? date.toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">
        {transaction.bookingId?.substring(0, 8) || 'N/A'}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell">{transaction.guestName || 'Guest'}</td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">{transaction.hostName || 'Host'}</td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
        ₱{(transaction.subtotal || 0).toLocaleString()}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-semibold text-emerald-600">
        ₱{(transaction.adminFee || 0).toLocaleString()}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900 hidden xl:table-cell">
        ₱{(transaction.hostPayout || 0).toLocaleString()}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
          transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          transaction.status === 'refunded' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {transaction.status || 'N/A'}
        </span>
      </td>
    </tr>
  );
};

export default TransactionRow;

