import React from 'react';

interface ExperienceItem {
  title: string;
  company: string;
  period: string;
  description?: string;
}

interface ExperienceLogProps {
  experiences?: ExperienceItem[];
}

const ExperienceLog: React.FC<ExperienceLogProps> = ({ experiences = [] }) => {
  if (experiences.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No experience entries available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {experiences.map((exp, index) => (
        <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
          <h3 className="text-lg font-semibold">{exp.title}</h3>
          <p className="text-sm text-gray-600">{exp.company}</p>
          <p className="text-xs text-gray-500">{exp.period}</p>
          {exp.description && (
            <p className="mt-2 text-sm text-gray-700">{exp.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ExperienceLog;

