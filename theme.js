// src/utils/theme.js
export const getThemeColors = (isHighContrast) => ({
    bg: isHighContrast ? 'bg-gray-900' : 'bg-gray-100',
    text: isHighContrast ? 'text-gray-100' : 'text-gray-800',
    cardBg: isHighContrast ? 'bg-gray-800' : 'bg-white',
    cardBorder: isHighContrast ? 'border-gray-700' : 'border-gray-200',
    primaryBtnBg: isHighContrast ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600',
    secondaryBtnBg: isHighContrast ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300',
    inputBg: isHighContrast ? 'bg-gray-700' : 'bg-white',
    inputBorder: isHighContrast ? 'border-gray-600' : 'border-gray-300',
    aiBubbleBg: isHighContrast ? 'bg-indigo-800' : 'bg-indigo-100',
    userBubbleBg: isHighContrast ? 'bg-green-800' : 'bg-green-100',
    sidebarBg: isHighContrast ? 'bg-gray-800' : 'bg-gray-50',
    sidebarText: isHighContrast ? 'text-gray-200' : 'text-gray-700',
    sidebarActiveBg: isHighContrast ? 'bg-gray-700' : 'bg-gray-200',
});
