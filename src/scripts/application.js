const remote = require('@electron/remote')
const dialog = remote.dialog
const shell = remote.shell
const fs = require('fs')
const path = require('path')


const textPath = document.querySelector('#textPath')
const itemsList = document.querySelector('#itemsList')
const table = document.querySelector('#mainTable')
const masterCheckbox = document.querySelector('#masterCheckbox')


const totalFilesElement = document.querySelector('#totalFiles')
const totalFoldersElement = document.querySelector('#totalFolders')
const totalItemsElement = document.querySelector('#totalItems')
const selectedItemsElement = document.querySelector('#selectedItems')

let inputDelimiter = document.querySelector('#delimiter')

let selectDate = document.querySelector('#selectDate')
let customText = document.querySelector('#customText')
let startWith = document.querySelector('#startWith')
let incrementBy = document.querySelector('#incrementBy')

let chkPrependMode = document.querySelector('#chkPrependMode')
let chkAppendMode = document.querySelector('#chkAppendMode')

let totalFiles = 0, totalFolders = 0, totalItems = 0, selectedItems = 0
let undoStack = [], redoStack = []
let mode = 'prepend'
let delimiter = ''


let date = new Date()
let year = date.getFullYear()
let day = date.getDate() < 10 ? (0 + '' + date.getDate()) : date.getDate()
let month = date.getMonth() + 1
let fullMonth = month < 10 ? (0 + '' + month) : month
let formattedDate = `${year}-${fullMonth}-${day}`
document.querySelector('input[type="date"]').value = formattedDate


// Validation for invalid file name identifiers
document.addEventListener('keydown', (e) => {
    if (e.target.id == 'delimiter' || e.target.id == 'customText')
    {
        '\/:*?"<>|'.includes(e.key) ? e.preventDefault() : ''
    } else if (e.target.id == 'startWith' || e.target.id == 'incrementBy')
    {
        'e'.includes(e.key) ? e.preventDefault() : ''
    }
})


// Event listener for button elements
document.addEventListener('click', (e) => {

    if (e.target.id == "textPath")
    {
        const resp = dialog.showOpenDialog({ properties: ['openDirectory'] })
        resp.then(data => {
            if (data.canceled === false)
            {
                undoStack = []
                redoStack = []
                textPath.value = data.filePaths[0]
                render(textPath.value)
            }
        }).catch(err => {
            dialog.showErrorBox('Error 01', 'An error occured.')
            console.error(err)
        })
    }
    else if (Array.from(e.target.classList).includes('showDir'))
    {
        basePath = textPath.value
        if (basePath != '' || basePath != null)
        {
            let constructedPath = path.join(basePath, e.target.innerHTML)
            shell.showItemInFolder(constructedPath)
        }
    }
    else if (Array.from(e.target.classList).includes('placeholder'))
    {
        placeholder(e.target.id)
    }
    else if (Array.from(e.target.classList).includes('btnTrim'))
    {
        trimFiles(e.target.id)
    }
    else if (Array.from(e.target.classList).includes('timeTravelIcons'))
    {
        timeTravel(e.target.id)
    }
    else if (e.target.id == "btnDeselectAll")
    {
        let allCheckboxes = table.querySelectorAll('input[type="checkbox"]')
        allCheckboxes.forEach(item => item.checked = false)
        selectedItems = 0
        selectedItemsElement.innerHTML = `Selected items: ${selectedItems}`
    }
    else if (e.target.id == "refresh")
    {
        textPath.value != "" ? render() : ''
    }
    else if (e.target.id == "license_link")
    {
        shell.openPath(path.join(__dirname, 'LICENSE'))
    }
    else if (e.target.id == "profile_link")
    {
        shell.openExternal('https://forcle.in/')
    }
    else if (e.target.id == "browser_link")
    {
        shell.openExternal('https://flexa.forcle.in/')
    }
    else if (Array.from(e.target.classList).includes('forPopover'))
    {
        if (e.target.id == 'info')
        {
            document.getElementById('popover__wrapper').style.visibility = 'visible'
        } else
        {
            document.getElementById('popover__wrapper').style.visibility = 'hidden'
        }
    }
    else if (e.target.id == "btnSelectPreviousItems")
    {
        selectPreviouslyTransformedItems()
    }
})


// Event listener for input elements
document.addEventListener('input', (e) => {
    if (e.target.type == 'checkbox' && e.target.id.startsWith('chk_'))
    {
        let element = document.querySelector('#' + e.target.id)
        element.checked ? selectedItems++ : selectedItems--
        selectedItemsElement.innerHTML = `Selected items: ${selectedItems}`

    } else if (e.target.id == 'masterCheckbox')
    {
        selectedItems = 0
        if (masterCheckbox.checked)
        {
            table.querySelectorAll('input[type=checkbox]').forEach(item => {
                if (item.id !== 'masterCheckbox')
                {
                    item.checked = true
                    selectedItems++
                }
            })
        } else
        {
            table.querySelectorAll('input[type=checkbox]').forEach(item => {
                if (item.id !== 'masterCheckbox')
                {
                    item.checked = false
                    selectedItems = 0
                }
            })
        }
        selectedItemsElement.innerHTML = `Selected items: ${selectedItems}`
    } else if (e.target.id == "selectCase")
    {
        let selectedCase = document.querySelector('#' + e.target.id).value
        let ds = getDatasetOfCheckedItems()
        setInterval(() => {
            document.querySelector('#selectCase').selectedIndex = 0
        }, 3000)
        selectedCase != 0 ? changeCase(ds, selectedCase) : ''
    }
})


// Render directory's content in a table, default value is value of a textbox
function render(dirToRead = textPath.value) {
    let type = null
    let currentName = null
    let newName = null
    let ino = null
    let baseName = null

    itemsList.innerHTML = ''
    masterCheckbox.checked = false

    fs.readdir(dirToRead, (err, files) => {
        if (err)
        {
            dialog.showErrorBox('Error 02', 'An error occured.')
            console.error(err)
        }
        else
        {
            totalFiles = 0
            totalFolders = 0
            totalItems = 0
            selectedItems = 0

            if (files.length == 0)
            {
                totalFilesElement.innerHTML = `Total files: ${totalFiles}`
                totalFoldersElement.innerHTML = `Total folders: ${totalFolders}`
                totalItemsElement.innerHTML = `Total items: ${totalItems}`
                selectedItemsElement.innerHTML = `Selected items: ${selectedItems}`
            }
            else
            {
                files.forEach(file => {
                    fs.stat(path.join(dirToRead, file), (err, stats) => {
                        if (err)
                        {
                            dialog.showErrorBox('Error 03', 'An error occured.')
                            console.error(err)
                        } else
                        {
                            totalItems++
                            currentName = file
                            baseName = path.basename(currentName, path.extname(currentName))
                            ino = stats.ino
                            type = stats.isDirectory() ? 'Folder' : 'File'
                            stats.isDirectory() ? totalFolders++ : totalFiles++

                            newName = newName == null ? '-' : newName
                            let listItem = `<tr>
                                            <td>
                                                <input type="checkbox" id="chk_${ino}"
                                                data-filepath="${dirToRead}"
                                                data-filetype="${type}"
                                                data-currentname="${currentName}"
                                                data-chkid="chk_${ino}"
                                                data-ext="${path.extname(currentName)}"
                                                data-basename="${baseName}"
                                                data-operation="${null}"
                                                data-newbasename="${null}">
                                            </td>
                                            <td>${type}</td>
                                            <td><a href="#" class="showDir test">${currentName}</a></td>
                                        </tr>`
                            itemsList.innerHTML += listItem

                            totalFilesElement.innerHTML = `Total files: ${totalFiles}`
                            totalFoldersElement.innerHTML = `Total folders: ${totalFolders}`
                            totalItemsElement.innerHTML = `Total items: ${totalItems}`
                            selectedItemsElement.innerHTML = `Selected items: ${selectedItems}`
                        }
                    })
                })
            }
        }
    });
}


// Function for undo and redo
function timeTravel(btnId) {
    if (btnId == "undo" && undoStack.length > 0)
    {
        let topElement = undoStack[undoStack.length - 1]
        undoStack.pop()
        redoStack.push(topElement)

        topElement.forEach((el, i) => {
            let temp = el.newbasename
            el.newbasename = el.basename
            el.basename = temp
            el.currentname = `${el.basename}${el.ext}`
            if (i + 1 == topElement.length)
            {
                // console.log("undoStack", undoStack)
                // console.log("redoStack", redoStack)
                rename(topElement, 'timeTravel')
            }
        })
    } else if (btnId == "redo" && redoStack.length > 0)
    {
        let topElement = redoStack[redoStack.length - 1]
        redoStack.pop()
        undoStack.push(topElement)

        topElement.forEach((el, i) => {
            let temp = el.newbasename
            el.newbasename = el.basename
            el.basename = temp
            el.currentname = `${el.basename}${el.ext}`
            if (i + 1 == topElement.length)
            {
                // console.log("undoStack", undoStack)
                // console.log("redoStack", redoStack)
                rename(topElement, 'timeTravel')
            }
        })
    }
}


// Get dataset values of every selected items
function getDatasetOfCheckedItems() {
    let checkboxes = itemsList.querySelectorAll('input[type="checkbox"]')
    let arr = Array.from(checkboxes)
    let checkedItems = arr.filter(entry => entry.checked)
    let ds = checkedItems.map(item => item.dataset)
    return ds
}

function selectPreviouslyTransformedItems() {

    if (undoStack.length > 0)
    {
        // De-select every checkbox first
        table.querySelectorAll('input[type=checkbox]').forEach(item => {
            item.checked = false
        })
        selectedItems = 0

        // If Undo[].length > 1 then select the last element
        arr = undoStack.length > 0 ? undoStack[undoStack.length - 1] : []
        arr.forEach((el, i) => {

            if (document.querySelector("#" + el.chkid).checked == false)
            {
                document.querySelector("#" + el.chkid).checked = true
                selectedItems++
            }
            i + 1 == arr.length ? selectedItemsElement.innerHTML = `Selected items: ${selectedItems}` : ''
        })
    }

}


// rename() is a function that renames files/folders by getting values from an array of datasets
function rename(arr, operation = "rename") {

    arr.forEach((el, i) => {
        let filepath = el.filepath
        let currentname = path.join(filepath, el.currentname)
        let newname = path.join(filepath, el.newbasename + el.ext)

        fs.access(newname, (err) => {
            if (err || el.operation == "changeCase" && (newname !== currentname))
            {
                fs.rename(currentname, newname, (err) => {
                    if (err)
                    {
                        if ((err.toString()).includes('no such file or directory'))
                        {
                            dialog.showErrorBox('Error 04', `${currentname} does not exists.`)
                        } else
                        {
                            dialog.showErrorBox('Error 05', 'Error: Can not rename opened file or filename too short.')
                            console.error(err)
                            operation == "rename" ? undoStack.pop() : ''
                        }
                    }
                    i + 1 == arr.length && operation == "rename" ? undoStack.push(arr) && (redoStack = []) : ''
                    i + 1 == arr.length ? render() : ''
                })
            }
        })

    })

}


// Transformation
function changeCase(ds, letterCase) {
    if (ds.length < 1)
    {
        dialog.showMessageBox(
            remote.getCurrentWindow(),
            { title: 'Message', message: 'Please select atleast one file/ folder to rename.' }
        )
    } else
    {
        switch (letterCase)
        {
            case 'upperCase':
                ds.forEach((el, i) => {
                    el.operation = "changeCase"
                    el.newbasename = el.basename.toUpperCase()
                    if (i + 1 == ds.length)
                    {
                        rename(ds)
                    }
                })
                break;
            case 'lowerCase':
                ds.forEach((el, i) => {
                    el.operation = "changeCase"
                    el.newbasename = el.basename.toLowerCase()
                    if (i + 1 == ds.length)
                    {
                        rename(ds)
                    }
                })
                break;
            case 'capitalizeCase':
                ds.forEach((el, i) => {
                    el.operation = "changeCase"
                    str = el.basename.toLowerCase()
                    consolidated = ''
                    str.split(' ').forEach(part => {
                        consolidated += part.charAt(0).toUpperCase() + part.substr(1, part.length) + ' '
                    })
                    el.newbasename = `${consolidated.trim()}`
                    if (i + 1 == ds.length)
                    {
                        rename(ds)
                    }
                })
                break;
            case 'kebabCase':

                ds.forEach((el, i) => {
                    el.operation = "changeCase"
                    let basename = el.basename
                    el.newbasename = basename.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g).join('-').toLowerCase();

                    el.newbasename = `${el.newbasename.trim()}`
                    if (i + 1 == ds.length)
                    {
                        rename(ds)
                    }
                })

                break;
            case 'snakeCase':
                ds.forEach((el, i) => {
                    el.operation = "changeCase"
                    let basename = el.basename
                    el.newbasename = basename.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g).join('_').toLowerCase();
                    el.newbasename = `${el.newbasename.trim()}`
                    if (i + 1 == ds.length)
                    {
                        rename(ds)
                    }
                })
                break;
            default:
                render()
        }

    }
}


// Transformation
function trimFiles(btnId) {
    let ds = getDatasetOfCheckedItems()
    let delimiter = inputDelimiter.value != "" ? inputDelimiter.value : ' '
    if (ds.length > 0)
    {
        if (btnId == "btnTrimFromLeft")
        {
            ds.forEach((el, i) => {

                str = (el.basename.substr(el.basename.indexOf(delimiter) + 1, el.basename.length)).trim()
                el.newbasename = str.length > 0 ? str : el.basename

                if (i + 1 == ds.length)
                {
                    rename(ds)
                }
            })
        } else if (btnId == "btnTrimFromRight")
        {
            ds.forEach((el, i) => {
                str = (el.basename.substr(0, el.basename.lastIndexOf(delimiter))).trim()
                el.newbasename = str.length > 0 ? str : el.basename

                if (i + 1 == ds.length)
                {
                    rename(ds)
                }
            })
        }
    }
    else
    {
        dialog.showMessageBox(
            remote.getCurrentWindow(),
            { title: 'Message', message: 'Please select atleast one file/ folder to rename.' }
        )
    }
}

// Transformation
// placeholder() is a function that uses switch statement to identify the transformation from button's ID
function placeholder(btnId) {
    let ds = getDatasetOfCheckedItems()
    if (ds.length > 0)
    {

        delimiter = (inputDelimiter.value != '') ? inputDelimiter.value : ' '
        mode = (chkPrependMode.checked && chkAppendMode.checked) ? 'both' : chkPrependMode.checked ? 'prepend' : chkAppendMode.checked ? 'append' : 'prepend'
        newName = ''

        switch (btnId)
        {
            case 'btnApplyText':
                str = customText.value.trim()
                if (str != '')
                {
                    ds.forEach((el, i) => {
                        el.newbasename = mode == 'prepend' ? `${str}${delimiter}${el.basename.trim()}` : mode == 'append' ? `${el.basename.trim()}${delimiter}${str}` : `${str}${delimiter}${el.basename.trim()}${delimiter}${str}`

                        if (i + 1 == ds.length)
                        {
                            rename(ds)
                        }
                    })
                }
                break;

            case 'btnApplyDate':
                str = selectDate.value.trim()
                if (str != '')
                {
                    ds.forEach((el, i) => {
                        el.newbasename = mode == 'prepend' ? `${str}${delimiter}${el.basename}` : mode == 'append' ? `${el.basename}${delimiter}${str}` : `${str}${delimiter}${el.basename}${delimiter}${str}`

                        if (i + 1 == ds.length)
                        {
                            rename(ds)
                        }
                    })
                }
                break;

            case 'btnApplySerialNumber':
                str = parseInt(startWith.value.trim())
                increment = parseInt(incrementBy.value.trim())

                ds.forEach((el, i) => {

                    el.newbasename = mode == 'prepend' ? `${str}${delimiter}${el.basename}` : mode == 'append' ? `${el.basename}${delimiter}${str}` : `${str}${delimiter}${el.basename}${delimiter}${str}`
                    str += increment
                    if (i + 1 == ds.length)
                    {
                        rename(ds)
                    }
                })
                break;
        }
    } else
    {
        dialog.showMessageBox(
            remote.getCurrentWindow(),
            { title: 'Message', message: 'Please select atleast one file/ folder to rename.' }
        )
    }
}
