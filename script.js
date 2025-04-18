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

    // Debug logging function
    function log(message, isError = false) {
        console[isError ? 'error' : 'log'](`[Akitaki Navigator] ${message}`);
    }

    log('Initializing file navigator...');

    // Check if Akitaki is available
    document.addEventListener('akitaki-bridge-ready', () => {
        statusBar.textContent = 'Akitaki detected. Click "Connect" to start using the file navigator.';
        connectBtn.disabled = false;
        log('Akitaki bridge ready event received');
    });

    // Immediately check if Akitaki exists
    if (window.Akitaki) {
        log('Akitaki detected on page load');
        statusBar.textContent = 'Akitaki detected. Click "Connect" to start using the file navigator.';
        connectBtn.disabled = false;
    }

    // Fallback if Akitaki isn't installed
    setTimeout(() => {
        if (!window.Akitaki) {
            log('Akitaki not detected after timeout', true);
            statusBar.textContent = 'Akitaki extension not detected. Please install it to use this file navigator.';
            statusBar.classList.add('error');
            installationGuide.style.display = 'block';
        }
    }, 2000);

    // Connect to Akitaki when button is clicked
    connectBtn.addEventListener('click', () => {
        log('Connect button clicked');
        
        if (!window.Akitaki) {
            showError('Akitaki extension not found. Please install it first.');
            return;
        }
        
        // Using try-catch to better handle any API inconsistencies
        try {
            log('Attempting to connect to Akitaki with permissions');
            
            window.Akitaki.connect(['folderAccess', 'processFile'])
                .then(response => {
                    log(`Connection response: ${JSON.stringify(response)}`);
                    
                    if (response && response.success) {
                        statusBar.textContent = 'Connected to Akitaki. Select a folder to begin browsing.';
                        statusBar.classList.add('connected');
                        statusBar.classList.remove('error');
                        selectFolderBtn.disabled = false;
                        connected = true;
                    } else {
                        throw new Error('Failed to connect to Akitaki: ' + (response ? JSON.stringify(response) : 'No response'));
                    }
                })
                .catch(error => {
                    log(`Connection error: ${error.message}`, true);
                    showError(`Connection error: ${error.message}`);
                });
        } catch (e) {
            log(`Exception during connect attempt: ${e.message}`, true);
            showError(`Error connecting to Akitaki: ${e.message}`);
        }
    });

    // Select folder button handler
    selectFolderBtn.addEventListener('click', () => {
        log('Select folder button clicked');
        
        if (!connected) {
            showError('Please connect to Akitaki first.');
            return;
        }

        try {
            // First provide clear instructions to the user
            statusBar.textContent = 'Please select a folder in the Akitaki extension popup that appears...';
            statusBar.classList.remove('error');
            
            // Check which method is available in the API
            if (typeof window.Akitaki.selectFolder === 'function') {
                log('Using selectFolder API method');
                
                window.Akitaki.selectFolder()
                    .then(handleFolderSelection)
                    .catch(handleFolderError);
            } 
            else if (typeof window.Akitaki.requestFolder === 'function') {
                log('Using requestFolder API method');
                
                // Some versions of Akitaki might need explicit parameters
                window.Akitaki.requestFolder({
                    promptUser: true,  // Explicitly ask to show the folder picker
                    rememberChoice: true // Remember the last selected folder
                })
                .then(handleFolderSelection)
                .catch(handleFolderError);
            }
            else if (typeof window.Akitaki.openFolderPicker === 'function') {
                log('Using openFolderPicker API method');
                
                window.Akitaki.openFolderPicker()
                    .then(handleFolderSelection)
                    .catch(handleFolderError);
            }
            else {
                // Fallback to using processFile with a special operation
                log('Using processFile as fallback for folder selection');
                
                window.Akitaki.processFile({
                    operation: 'selectFolder',
                    showPicker: true
                })
                .then(handleFolderSelection)
                .catch(handleFolderError);
            }
        } catch (e) {
            log(`Exception during folder selection: ${e.message}`, true);
            showError(`Error selecting folder: ${e.message}`);
        }
    });

    // Handle successful folder selection
    function handleFolderSelection(folderInfo) {
        log(`Folder selection result: ${JSON.stringify(folderInfo)}`);
        
        // Different API versions might return different structures
        // Handle various possible response formats
        let folderPath = '';
        
        if (typeof folderInfo === 'string') {
            folderPath = folderInfo;
        } 
        else if (folderInfo && folderInfo.folderInfo && folderInfo.folderInfo.path) {
            folderPath = folderInfo.folderInfo.path;
        }
        else if (folderInfo && folderInfo.path) {
            folderPath = folderInfo.path;
        }
        else if (folderInfo && folderInfo.folderPath) {
            folderPath = folderInfo.folderPath;
        }
        else if (folderInfo && folderInfo.directory) {
            folderPath = folderInfo.directory;
        }
        
        if (folderPath) {
            currentPath = folderPath;
            navigationHistory = [currentPath];
            statusBar.textContent = `Selected folder: ${folderPath}`;
            fileBrowser.style.display = 'block';
            goBackBtn.disabled = false;
            updateBreadcrumb();
            loadFolderContents(currentPath);
        } else {
            showError('Invalid folder information returned from Akitaki');
            log('Detailed folder info: ' + JSON.stringify(folderInfo));
        }
    }

    // Handle folder selection error with more detailed instructions
    function handleFolderError(error) {
        log(`Folder selection error: ${error.message || error}`, true);
        
        // Provide more helpful error message with instructions
        if (error.message && error.message.includes("No folder selected")) {
            showError('No folder selected. Please try again and select a folder in the Akitaki dialog. ' +
                      'If no dialog appears, click the Akitaki extension icon in your browser toolbar first.');
            
            // Add a visual hint to help users understand what to do
            const extensionHint = document.createElement('div');
            extensionHint.innerHTML = '<div style="margin-top: 15px; padding: 10px; background-color: #ffffd6; border: 1px solid #e6e6b8; border-radius: 4px;">' +
                '<p><strong>Tip:</strong> If you don\'t see a folder selection dialog, try the following:</p>' +
                '<ol>' +
                '<li>Click the Akitaki extension icon <img src="https://chrome.google.com/webstore/detail/akitaki/obpbcigciafdoohpgbgnpphaccbaeiij/icon" style="height: 16px; vertical-align: middle;"> in your browser toolbar</li>' +
                '<li>In the extension popup, click "Select Folder" or "Choose Directory"</li>' +
                '<li>Select a folder in your file system</li>' +
                '<li>Return to this page and click "Select Folder" again</li>' +
                '</ol>' +
                '</div>';
            
            // Remove any existing hint before adding a new one
            const existingHint = document.getElementById('extensionHint');
            if (existingHint) {
                existingHint.remove();
            }
            
            extensionHint.id = 'extensionHint';
            document.querySelector('.container').appendChild(extensionHint);
        } else {
            showError(`Folder selection error: ${error.message || error}`);
        }
    }

    // Go back button handler
    goBackBtn.addEventListener('click', () => {
        log('Back button clicked');
        
        if (navigationHistory.length > 1) {
            navigationHistory.pop(); // Remove current
            currentPath = navigationHistory[navigationHistory.length - 1];
            updateBreadcrumb();
            loadFolderContents(currentPath);
        }
    });

    // Load folder contents
    function loadFolderContents(folderPath) {
        log(`Loading folder contents for: ${folderPath}`);
        fileList.innerHTML = '';
        fileContent.style.display = 'none';
        
        // Use the 'listContents' operation which seems to work but returns a non-array format
        window.Akitaki.processFile({
            path: folderPath,
            operation: 'listContents'
        })
        .then(contents => {
            log(`Raw folder contents: ${JSON.stringify(contents)}`);
            
            // Handle different response formats
            if (Array.isArray(contents)) {
                log('Contents is an array, displaying directly');
                displayFolderContents(contents);
            } 
            else if (contents && typeof contents === 'object') {
                // Try to extract files from different possible structures
                log('Contents is an object, trying to extract file/folder items');
                const items = [];
                
                // If the response has 'files' or 'folders' properties
                if (contents.files && Array.isArray(contents.files)) {
                    log(`Found ${contents.files.length} files in the response`);
                    contents.files.forEach(file => {
                        if (typeof file === 'string') {
                            items.push({
                                name: file,
                                isDirectory: false
                            });
                        } else if (file.name) {
                            items.push({
                                name: file.name,
                                isDirectory: false,
                                ...file
                            });
                        }
                    });
                }
                
                if (contents.folders && Array.isArray(contents.folders)) {
                    log(`Found ${contents.folders.length} folders in the response`);
                    contents.folders.forEach(folder => {
                        if (typeof folder === 'string') {
                            items.push({
                                name: folder,
                                isDirectory: true
                            });
                        } else if (folder.name) {
                            items.push({
                                name: folder.name,
                                isDirectory: true,
                                ...folder
                            });
                        }
                    });
                }
                
                // If we have entries directly in the object
                if (contents.entries && Array.isArray(contents.entries)) {
                    log(`Found ${contents.entries.length} entries in the response`);
                    contents.entries.forEach(entry => {
                        if (typeof entry === 'string') {
                            // Try to guess if it's a directory by checking for trailing slash
                            const isDir = entry.endsWith('/');
                            items.push({
                                name: isDir ? entry.slice(0, -1) : entry,
                                isDirectory: isDir
                            });
                        } else if (entry.name) {
                            items.push({
                                name: entry.name,
                                isDirectory: !!entry.isDirectory,
                                ...entry
                            });
                        }
                    });
                }
                
                // If we found items to display
                if (items.length > 0) {
                    log(`Extracted ${items.length} items to display`);
                    displayFolderContents(items);
                } else {
                    // Last resort: try to convert all object keys to files
                    log('No items found in standard properties, trying to use object keys as filenames');
                    const keys = Object.keys(contents).filter(key => 
                        key !== 'success' && key !== 'error' && key !== 'path'
                    );
                    
                    if (keys.length > 0) {
                        const fileItems = keys.map(key => {
                            // Try to determine if it's a directory based on the value
                            const isDir = typeof contents[key] === 'object' && contents[key] !== null;
                            return {
                                name: key,
                                isDirectory: isDir
                            };
                        });
                        displayFolderContents(fileItems);
                    } else {
                        showError('Could not extract file or folder listings from the response');
                    }
                }
            } else {
                showError('Invalid folder contents returned');
            }
        })
        .catch(error => {
            log(`Error loading folder contents: ${error.message}`, true);
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
        log(`Loading file content: ${filePath}`);
        fileContent.style.display = 'none';
        
        // Use the 'readFile' operation which is explicitly mentioned in the error as supported
        window.Akitaki.processFile({
            path: filePath,
            operation: 'readFile'
        })
        .then(content => {
            log('File content loaded successfully');
            
            // Handle different response formats
            if (typeof content === 'string') {
                fileContent.textContent = content;
            } 
            else if (content && content.content && typeof content.content === 'string') {
                fileContent.textContent = content.content;
            } 
            else if (content && content.data && typeof content.data === 'string') {
                fileContent.textContent = content.data;
            } 
            else if (content && typeof content === 'object') {
                // If it's JSON, stringify it for display
                try {
                    fileContent.textContent = JSON.stringify(content, null, 2);
                } catch (e) {
                    fileContent.textContent = 'Unable to display content: ' + e.message;
                }
            } 
            else {
                fileContent.textContent = 'File content could not be displayed in text format.';
            }
            
            fileContent.style.display = 'block';
        })
        .catch(error => {
            log(`Error reading file: ${error.message}`, true);
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
        log(message, true);
    }

    // Help button and modal functionality
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeModal = document.getElementById('closeModal');
    
    helpBtn.addEventListener('click', () => {
        helpModal.style.display = 'block';
    });
    
    closeModal.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === helpModal) {
            helpModal.style.display = 'none';
        }
    });

    // Add keyboard shortcut to close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && helpModal.style.display === 'block') {
            helpModal.style.display = 'none';
        }
    });
});