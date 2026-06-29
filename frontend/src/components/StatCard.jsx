const StatCard = ({ label, value }) => (
  <div className="bg-parchment border border-stone-200 rounded-xl shadow-sm p-5 flex flex-col gap-1">
    <span className="text-sm text-taupe">{label}</span>
    <span className="text-3xl font-bold text-cocoa">{value}</span>
  </div>
);

export default StatCard;
