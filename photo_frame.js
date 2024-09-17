// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: image;
const VERSION = '1.0.1';

const DEBUG = false;
const log = (args) => {

    if (DEBUG) {
        console.log(args);
    }
};

const WIDGET_FAMILY = Device.isPad() ? ['Small', 'Medium', 'Large', 'ExtraLarge'] : ['Small', 'Medium', 'Large'];

// DO NOT EDIT BEYOND THIS LINE ------------------
const MENU_PROPERTY = {
    rowDismiss: true,
    rowHeight: 50,
    subtitleColor: Color.lightGray()
};
Object.freeze(MENU_PROPERTY);

const CommonUtil = {
    isNumber: function (value) {
        let isValid = false;
    
        if (typeof value === 'number') {
            isValid = true;
        } else if (typeof value === 'string') {
            isValid = /^\d{1,}$/.test(value);
        }
    
        return isValid;
    },
    compareVersion: function (version1 = '', version2 = '') {
        version1 = version1.replace(/\.|\s|\r\n|\r|\n/gi, '');
        version2 = version2.replace(/\.|\s|\r\n|\r|\n/gi, '');

        if (!this.isNumber(version1) || !this.isNumber(version2)) {
            return false;
        }

        return version1 < version2;
    }
};

const PhotoFrameClient = {
    //----------------------------------------------
    initialize: function () {
        try {
            this.USES_ICLOUD = module.filename.includes('Documents/iCloud~');
            this.fm = this.USES_ICLOUD ? FileManager.iCloud() : FileManager.local();
            this.root = this.fm.joinPath(this.fm.documentsDirectory(), '/cache/photoFrame');
            this.resourcePath = this.fm.joinPath(this.root, 'picture.png');
            this.fm.createDirectory(this.root, true);
        } catch (e) {
            log(e.message);
        }
    },
    setResource: async function (image) {
        this.fm.writeImage(this.resourcePath, image);
    },
    //----------------------------------------------
    getResource: async function () {

        if (this.fm.fileExists(this.resourcePath)) {
            await this.fm.downloadFileFromiCloud(this.resourcePath);
			return this.fm.readImage(this.resourcePath);
        }
        
        return null;
    },
    clearCache: async function () {
        this.fm.remove(this.root);
    },
    updateModule: async function () {
        try {
            const latestVersion = await new Request('https://raw.githubusercontent.com/clauzewitz/scriptable-photo-frame-widgets/main/version').loadString();

            if (CommonUtil.compareVersion(VERSION, latestVersion)) {
                const code = await new Request('https://raw.githubusercontent.com/clauzewitz/scriptable-photo-frame-widgets/main/photo_frame.js').loadString();
                this.fm.writeString(this.fm.joinPath(this.fm.documentsDirectory(), `${Script.name()}.js`), code);
                await PhotoFrameClient.presentAlert(`Update to version ${latestVersion}\nPlease launch the app again.`);
            } else {
                await PhotoFrameClient.presentAlert(`version ${VERSION} is currently the newest version available.`);
            }
        } catch (e) {
            log(e.message);
        }
    },
    //----------------------------------------------
    presentAlert: async function (prompt = '', items = ['OK'], asSheet = false) {
        try {
            const alert = new Alert();
            alert.message = prompt;
    
            items.forEach(item => {
                alert.addAction(item);
            });
    
            return asSheet ? await alert.presentSheet() : await alert.presentAlert();
        } catch (e) {
            log(e.message);
        }
    }
};

//------------------------------------------------
const createWidget = async () => {
    const widget = new ListWidget();
    widget.backgroundImage = await PhotoFrameClient.getResource();

    return widget;
};

//------------------------------------------------
const presentAlert = async (prompt, items, asSheet) => {
    const alert = new Alert();
    alert.message = prompt;
    
    for (const item of items) {
        alert.addAction(item);
    }

    return asSheet ? await alert.presentSheet() : await alert.presentAlert();
};

const MENU_ROWS = {
    title: {
        isHeader: true,
        title: 'Photo Frame',
        subtitle: `version: ${VERSION}`,
        onSelect: undefined
    },
    checkUpdate: {
        isHeader: false,
        title: 'Check for Updates',
        subtitle: 'Check for updates to the latest version.',
        onSelect: async () => {
            PhotoFrameClient.updateModule();
        }
    },
    setPhoto: {
        isHeader: false,
        title: 'Set Widget',
        subtitle: 'Provides a preview for testing.',
        onSelect: async () => {
            const img = await Photos.fromLibrary();
		    PhotoFrameClient.setResource(img);
            
            const widget = await createWidget();
            
            await widget[`presentLarge`]();
        }
	},
    preview: {
        isHeader: false,
        title: 'Preview Widget',
        subtitle: 'Provides a preview for testing.',
        onSelect: async () => {
            const options = [...WIDGET_FAMILY, 'Cancel'];
            const resp = await presentAlert('Preview Widget', options);
    
            if (resp === options.length - 1) {
                return;
            }
    
            const size = options[resp];

            const widget = await createWidget();
            
            await widget[`present${size}`]();
        }
    },
    clearCache: {
        isHeader: false,
        title: 'Clear cache',
        subtitle: 'Clear all caches.',
        onSelect: async () => {
            await PhotoFrameClient.clearCache();
        }
    }
};

// information
PhotoFrameClient.initialize();

if (config.runsInWidget) {
    const widget = await createWidget();
    Script.setWidget(widget);
} else {
    const menu = new UITable();
    menu.showSeparators = true;

    Object.values(MENU_ROWS).forEach((rowInfo) => {
        const row = new UITableRow();
        row.isHeader = rowInfo.isHeader;
        row.dismissOnSelect = MENU_PROPERTY.rowDismiss;
        row.height = MENU_PROPERTY.rowHeight;
        const cell = row.addText(rowInfo.title, rowInfo.subtitle);
        cell.subtitleColor = MENU_PROPERTY.subtitleColor;
        row.onSelect = rowInfo.onSelect;
        menu.addRow(row);
    });

    await menu.present(false);
}

Script.complete();
