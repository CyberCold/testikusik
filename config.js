const GITHUB_CONFIG = {
    repo: 'CyberCold/Paradise',
    usersFilePath: 'users.json',
};

export const USERS_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_CONFIG.repo}/main/${GITHUB_CONFIG.usersFilePath}`;
export const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.usersFilePath}`;
