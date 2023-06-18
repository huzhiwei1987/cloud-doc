import React, { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../hooks/useKeyPress'
import useContextMenu from '../hooks/useContextMenu'
import { getParentNode } from '../utils/helper'

const FileList = ({files, onFileClick, onSaveEdit, onFileDelete}) => {
  const inputEL = useRef(null)
  const [editStatus, setEditStatus] = useState('')
  const [value, setValue] = useState('')
  const enterPressed = useKeyPress(13)
  const escPressed = useKeyPress(27)

  const closeSearch = (file) => {
    setEditStatus('')
    setValue('')
    if (file?.isNew) {
      onFileDelete(file.id)
    }
  }

  const clickedElement = useContextMenu([
    {
      label: '打开',
      click: () => {
        const parentElement = getParentNode(clickedElement.current, 'file-item')
        if (parentElement) {
          onFileClick(parentElement.dataset.id)
        }
        // console.log(parentElement.dataset.id)
      }
    },
    {
      label: '重命名',
      click: () => {
        console.log('renameing')
        const parentElement = getParentNode(clickedElement.current, 'file-item')
        if (parentElement) {
          setEditStatus(parentElement.dataset.id)
          setValue(parentElement.dataset.title)
        }
      }
    },
    {
      label: '删除',
      click: () => {
        console.log('deleteing')
        const parentElement = getParentNode(clickedElement.current, 'file-item')
        if (parentElement) {
          onFileDelete(parentElement.dataset.id)
        }
      }
    }
  ], '.file-list', files)

  useEffect(() => {
    const editItem = files.find(file => file.id === editStatus)
    if (enterPressed && editStatus && value.trim()) {
      onSaveEdit(editStatus, value, editItem.isNew)
      setEditStatus('')
      setValue('')
    }
    if (escPressed && editStatus) {
      closeSearch(editItem)
    }
    // const handleInputEvent = (event) => {
    //   const { keyCode } = event
    //   if (keyCode === 13 && editStatus) {
    //     onSaveEdit(editStatus, value)
    //     setEditStatus('')
    //     setValue('')
    //   } else if (keyCode === 27 && editStatus) {
    //     closeSearch(event)
    //   }
    // }
    // document.addEventListener('keyup', handleInputEvent)
    // return () => {
    //   document.removeEventListener('keyup', handleInputEvent)
    // }
  }, [enterPressed, escPressed])

  useEffect(() => {
    const newFile = files.find(file => file.isNew)
    if (newFile) {
      setEditStatus(newFile.id)
      setValue(newFile.title)
    }
  }, [files])

  useEffect(() => {
    if (editStatus) {
      inputEL.current?.focus()
    }
  }, [editStatus])

  return (
    <ul className="list-group list-group-flush file-list">
      {
        files?.map(file => (
          <li key={file?.id} className="list-group-item bg-light row d-flex align-items-center file-item" 
            data-id={file.id} data-title={file.title}>
            {
              file?.id !== editStatus && !file?.isNew ? 
              <>
                <span className='col-2'>
                  <FontAwesomeIcon title='icon' size='lg' icon={faMarkdown} />
                </span>
                <span className='col-7 c-link' onClick={() => {onFileClick(file?.id)}}>{file?.title}</span>
                {/* <button type='button' className='icon-button col-1' onClick={() => {
                  setEditStatus(file?.id)
                  setValue(file?.title)
                }}>
                  <FontAwesomeIcon title='编辑' size='lg' icon={faEdit} />
                </button>
                <button type='button' className='icon-button col-1' onClick={() => {onFileDelete(file?.id)}}>
                  <FontAwesomeIcon title='删除' size='lg' icon={faTrash} />
                </button> */}
              </> : 
              <div className='d-flex justify-content-between align-items-center'>
                <input placeholder='请输入文件名称' ref={inputEL} className='form-control' value={value} onChange={(e) => {setValue(e.target.value)}} />
                <button type='button' className='icon-button' onClick={() => {closeSearch(file)}}>
                  <FontAwesomeIcon title='关闭' size='lg' icon={faTimes} />
                </button>
              </div>
            }
          </li>
        ))
      }
    </ul>
  )
}

FileList.propTypes = {
  files: PropTypes.array,
  onFileClick: PropTypes.func,
  onSaveEdit: PropTypes.func,
  onFileDelete: PropTypes.func
}

FileList.defaultProps = {
  files: []
}

export default FileList