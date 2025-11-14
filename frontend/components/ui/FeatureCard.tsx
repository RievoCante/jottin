import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  onClick,
}) => {
  return (
    <div
      className="bg-[#101010] p-6 rounded-2xl border border-gray-800 flex flex-col cursor-pointer transition-all hover:border-indigo-500 hover:bg-[#131313]"
      onClick={onClick}
    >
      <div className="text-indigo-400 w-8 h-8 mb-4">{icon}</div>
      <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
