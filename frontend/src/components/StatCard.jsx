const StatCard = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-1">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-3xl font-bold text-gray-800">{value}</span>
  </div>
);

export default StatCard;
