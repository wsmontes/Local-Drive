# Akitaki Extension - Usage Guide

## Overview

Akitaki is a Chrome extension that creates a secure bridge between websites and your local file system. It allows authorized websites to access and process files from a designated folder on your computer while maintaining security and privacy.

## Key Features

- **Local Server**: Run a local server on your machine that can access designated folders
- **Secure Access**: Only websites you authorize can access your local files
- **Granular Permissions**: Control what each website can do with your files
- **Privacy Control**: Your data remains on your computer - it's never uploaded to external servers

## Installation

### Installing the Chrome Extension

1. Download the Akitaki extension from the Chrome Web Store (or load it as an unpacked extension for development)
2. Click on the Akitaki icon in your Chrome toolbar to open the extension popup
3. Follow the initial setup instructions

### Setting Up the Local Server

The local server component needs to be installed separately:

1. Download the Akitaki local server package from our website
2. Extract the files to a location on your computer
3. Open a terminal and navigate to the extracted folder
4. Run `npm install` to install the required dependencies
5. Run `node setup.js` to register the native messaging host with Chrome

## Using Akitaki

### Basic Workflow

1. **Start the Local Server**: Click the "Start Server" button in the extension popup
2. **Select a Folder**: Click "Select Folder" and choose which folder you want to make available
3. **Visit Compatible Websites**: Websites that support Akitaki will request access
4. **Authorize Access**: Grant or deny access when prompted
5. **Use Website Features**: The website can now access your selected folder based on the permissions you granted

### Understanding Permissions

When a website requests access, it will ask for specific permissions:

- **basic**: Can check if the extension is available (minimal access)
- **folderAccess**: Can see information about your selected folder
- **processFile**: Can read and process files from your selected folder
- **writeFile**: Can create or modify files in your selected folder (if granted)

You can always revoke permissions by clicking on a website in the "Authorized Websites" section of the extension popup and clicking "Revoke Access".

## For Developers

### Integrating with Akitaki in Your Website

To use Akitaki in your website, include the following JavaScript:

```javascript
// Check if Akitaki is available
document.addEventListener('akitaki-bridge-ready', () => {
  console.log('Akitaki is available!');
  
  // Connect to Akitaki
  window.Akitaki.connect(['folderAccess', 'processFile'])
    .then(response => {
      if (response.success) {
        console.log('Connected to Akitaki:', response);
        
        // Request folder access
        return window.Akitaki.requestFolder();
      }
    })
    .then(folderInfo => {
      console.log('Selected folder:', folderInfo);
      
      // Process files as needed
      // Example: Process a specific file
      return window.Akitaki.processFile({
        path: 'example.txt',
        operation: 'read'
      });
    })
    .then(result => {
      console.log('File processed:', result);
    })
    .catch(error => {
      console.error('Akitaki error:', error);
    });
});

// Fallback if Akitaki isn't installed
setTimeout(() => {
  if (!window.Akitaki) {
    console.log('Akitaki extension not detected');
    // Show alternative UI or prompt to install
  }
}, 1000);
```

### API Reference

The Akitaki JavaScript API provides the following methods:

- `Akitaki.connect(permissions)`: Connect to the extension and request permissions
- `Akitaki.requestFolder()`: Request access to the user-selected folder
- `Akitaki.processFile(options)`: Process a file with the specified options

## Troubleshooting

### Common Issues

1. **"Extension not responding"**
   - Check if the extension is properly installed and enabled
   - Try restarting Chrome

2. **"Unable to start local server"**
   - Ensure the local server component is properly installed
   - Check if another process is using the same port
   - Try restarting your computer

3. **"Permission denied" when selecting a folder**
   - Make sure you have read/write permissions for the folder
   - Try selecting a different folder

4. **Website cannot connect to Akitaki**
   - Ensure the website is using the correct API
   - Check if you've authorized the website in the extension popup

## Security Considerations

- Akitaki never sends your files to external servers - all processing happens locally
- Only websites you explicitly authorize can access your selected folder
- The connection between websites and your local server is secured with a unique token
- You can revoke access at any time
- File access is restricted to the folder you select

## Privacy Policy

Your privacy is important to us. Akitaki:

- Does not collect any personal information
- Does not track your browsing activity
- Does not share any data with third parties
- All data access is transparent and under your control

## Get Help

If you have questions or need assistance:

- Visit our support website: [support.akitaki.com](https://support.akitaki.com)
- Email us at: [support@akitaki.com](mailto:support@akitaki.com)
- Check our documentation: [docs.akitaki.com](https://docs.akitaki.com)