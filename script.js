document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const statusBar = document.getElementById('statusBar');
    const connectBtn = document.getElementById('connectBtn');
    const selectFolderBtn = document.getElementById('selectFolderBtn');
    const goBackBtn = document.getElementById('goBackBtn');
    const fileBrowser = document.getElementById('fileBrowser');
    const breadcrumb = document.getElementById('breadcrumb');
    const fileList = document.getElementById('fileList');
    const fileContent = document.getElementById('fileContent');
    const installationGuide = document.getElementById('installationGuide');

    // Application state
    let currentPath = '';
    let navigationHistory = [];
    let connected = false;

    // Check if Akitaki is available
    document.addEventListener('akitaki-bridge-ready', () => {
        statusBar.textContent = 'Akitaki detected. Click "Connect" to start using the file navigator.';
        connectBtn.disabled = false;
    });

    // Fallback if Akitaki isn't installed
    setTimeout(() => {
        if (!window.Akitaki) {
            statusBar.textContent = 'Akitaki extension not detected. Please install it to use this file navigator.';
            statusBar.classList.add('error');
            installationGuide.style.display = 'block';
        }
    }, 2000);

    // Connect to Akitaki when button is clicked
    connectBtn.addEventListener('click', () => {
        if (!window.Akitaki) {
            showError('Akitaki extension not found. Please install it first.');
            return;
        }
        
        window.Akitaki.connect(['folderAccess', 'processFile'])
            .then(response => {
                if (response.success) {
                    statusBar.textContent = 'Connected to Akitaki. Select a folder to begin browsing.';
                    statusBar.classList.add('connected');
                    statusBar.classList.remove('error');
                    selectFolderBtn.disabled = false;
                    connected = true;
                    return response;
                } else {
                    throw new Error('Failed to connect to Akitaki.');
                }
            })
            .catch(error => {
                showError(`Connection error: ${error.message}`);
            });
    });

    // Select folder button handler
    selectFolderBtn.addEventListener('click', () => {
        if (!connected) {
            showError('Please connect to Akitaki first.');
            return;
        }

        window.Akitaki.requestFolder()
            .then(folderInfo => {
                if (folderInfo && folderInfo.path) {
                    currentPath = folderInfo.path;
                    navigationHistory = [currentPath];
                    statusBar.textContent = `Selected folder: ${folderInfo.path}`;
                    fileBrowser.style.display = 'block';
                    goBackBtn.disabled = false;
                    updateBreadcrumb();
                    loadFolderContents(currentPath);
                }
            })
            .catch(error => {
                showError(`Folder selection error: ${error.message}`);
            });
    });

    // Go back button handler
    goBackBtn.addEventListener('click', () => {
        if (navigationHistory.length > 1) {
            navigationHistory.pop(); // Remove current
            currentPath = navigationHistory[navigationHistory.length - 1];
            updateBreadcrumb();
            loadFolderContents(currentPath);
        }
    });

    // Load folder contents
    function loadFolderContents(folderPath) {
        fileList.innerHTML = '';
        fileContent.style.display = 'none';
        
        window.Akitaki.processFile({
            path: folderPath,
            operation: 'listContents'
        })
        .then(contents => {
            if (Array.isArray(contents)) {
                displayFolderContents(contents);
            } else {
                showError('Invalid folder contents returned');
            }
        })
        .catch(error => {
            showError(`Error loading folder contents: ${error.message}`);
        });
    }

    // Display folder contents in the file list
    function displayFolderContents(contents) {
        if (contents.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = 'Empty folder';
            fileList.appendChild(emptyItem);
            return;
        }

        // Sort items: folders first, then files, both alphabetically
        contents.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        contents.forEach(item => {
            const listItem = document.createElement('li');
            
            const iconSpan = document.createElement('span');
            iconSpan.className = item.isDirectory ? 'folder-icon' : 'file-icon';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name;
            
            listItem.appendChild(iconSpan);
            listItem.appendChild(nameSpan);
            
            listItem.addEventListener('click', () => {
                const itemPath = `${currentPath}/${item.name}`.replace(/\/\//g, '/');
                
                if (item.isDirectory) {
                    // Navigate to this directory
                    currentPath = itemPath;
                    navigationHistory.push(currentPath);
                    updateBreadcrumb();
                    loadFolderContents(currentPath);
                } else {
                    // Display file content
                    loadFileContent(itemPath);
                }
            });
            
            fileList.appendChild(listItem);
        });
    }

    // Load and display file content
    function loadFileContent(filePath) {
        window.Akitaki.processFile({
            path: filePath,
            operation: 'read'
        })
        .then(content => {
            fileContent.textContent = content;
            fileContent.style.display = 'block';
        })
        .catch(error => {
            showError(`Error reading file: ${error.message}`);
        });
    }

    // Update breadcrumb navigation
    function updateBreadcrumb() {
        // Clear existing breadcrumb
        breadcrumb.innerHTML = '';
        
        // Split the path
        const pathParts = currentPath.split('/').filter(part => part);
        
        // Create home element
        const homeSpan = document.createElement('span');
        homeSpan.textContent = 'Home';
        homeSpan.addEventListener('click', () => {
            if (navigationHistory.length > 0) {
                currentPath = navigationHistory[0]; // Return to root folder
                navigationHistory = [currentPath];
                updateBreadcrumb();
                loadFolderContents(currentPath);
            }
        });
        breadcrumb.appendChild(homeSpan);
        
        // Create path segments
        let currentBuildPath = '';
        pathParts.forEach((part, index) => {
            breadcrumb.appendChild(document.createTextNode(' > '));
            
            const partSpan = document.createElement('span');
            partSpan.textContent = part;
            
            // Only make it clickable if it's not the last item (current directory)
            if (index < pathParts.length - 1) {
                currentBuildPath += '/' + part;
                const pathToNavigate = currentBuildPath;
                
                partSpan.addEventListener('click', () => {
                    currentPath = pathToNavigate;
                    // Trim navigation history
                    navigationHistory = navigationHistory.slice(
                        0, 
                        navigationHistory.indexOf(pathToNavigate) + 1 || 1
                    );
                    updateBreadcrumb();
                    loadFolderContents(currentPath);
                });
            }
            
            breadcrumb.appendChild(partSpan);
        });
    }

    // Show error in the status bar
    function showError(message) {
        statusBar.textContent = message;
        statusBar.classList.add('error');
        statusBar.classList.remove('connected');
        console.error(message);
    }
});