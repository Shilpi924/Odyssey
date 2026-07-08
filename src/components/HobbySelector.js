'use client';

const AVAILABLE_HOBBIES = [
  'Hiking',
  'Food',
  'Museums',
  'Art',
  'Nightlife',
  'History',
  'Nature'
];

export default function HobbySelector({ selectedHobbies, onChange }) {
  const toggleHobby = (hobby) => {
    if (selectedHobbies.includes(hobby)) {
      onChange(selectedHobbies.filter((h) => h !== hobby));
    } else {
      onChange([...selectedHobbies, hobby]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg shadow">
      <h3 className="w-full text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        Filter by Interests
      </h3>
      {AVAILABLE_HOBBIES.map((hobby) => {
        const isSelected = selectedHobbies.includes(hobby);
        return (
          <button
            key={hobby}
            onClick={() => toggleHobby(hobby)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {hobby}
          </button>
        );
      })}
    </div>
  );
}
