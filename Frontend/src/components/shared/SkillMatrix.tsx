import React from 'react';

interface Skill {
  name: string;
  level: number; // 1-5
  category?: string;
}

interface SkillMatrixProps {
  skills?: Skill[];
}

const SkillMatrix: React.FC<SkillMatrixProps> = ({ skills = [] }) => {
  if (skills.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No skills available.</p>
      </div>
    );
  }

  const getLevelColor = (level: number) => {
    if (level >= 4) return 'bg-green-500';
    if (level >= 3) return 'bg-blue-500';
    if (level >= 2) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <div className="space-y-4">
      {skills.map((skill, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="w-32 text-sm font-medium">{skill.name}</div>
          <div className="flex-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-4 flex-1 rounded ${
                  level <= skill.level
                    ? getLevelColor(skill.level)
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="w-8 text-xs text-gray-500 text-right">
            {skill.level}/5
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkillMatrix;

