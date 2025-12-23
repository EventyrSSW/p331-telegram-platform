import styles from './CategoryFilter.module.css';

// Mock categories - can be fetched from API later
const MOCK_CATEGORIES = [
  { id: 'all', label: 'All', icon: '🎮' },
  { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
  { id: 'cards', label: 'Cards', icon: '🃏' },
  { id: 'board', label: 'Board', icon: '♟️' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'arcade', label: 'Arcade', icon: '👾' },
  { id: 'casino', label: 'Casino', icon: '🎰' },
];

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'all') {
      onCategoryChange(null);
    } else {
      onCategoryChange(categoryId === selectedCategory ? null : categoryId);
    }
  };

  return (
    <div className={styles.container}>
      {MOCK_CATEGORIES.map((category) => (
        <button
          key={category.id}
          className={`${styles.category} ${
            (category.id === 'all' && !selectedCategory) || category.id === selectedCategory
              ? styles.categoryActive
              : ''
          }`}
          onClick={() => handleCategoryClick(category.id)}
        >
          <span className={styles.categoryIcon}>{category.icon}</span>
          <span className={styles.categoryLabel}>{category.label}</span>
        </button>
      ))}
    </div>
  );
};
