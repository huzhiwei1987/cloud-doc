import React, { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import PropTypes from 'prop-types'

const BottomBtn = ({text, colorClass, icon, onBtnClick}) => {
  return (
    <button
      onClick={onBtnClick}
      type='button'
      className={`btn btn-block no-border ${colorClass}`}
    >
      <FontAwesomeIcon className='me-2' size='lg' icon={icon} />
      {text}
    </button>
  )
}

BottomBtn.propTypes = {
  text: PropTypes.string,
  colorClass: PropTypes.string,
  icon: PropTypes.object.isRequired,
  onBtnClick: PropTypes.func
}

BottomBtn.defaultProps = {
  text: '新建'
}

export default BottomBtn