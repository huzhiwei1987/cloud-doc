import React from "react"
import './Loader.scss'

const Loader = ({text = '处理中'}) => {
  return (
    <div className="loading-component text-center">
      <div class="spinner-grow text-primary" role="status">
        <span class="sr-only">{text}</span>
      </div>
      <h5 className="text-primary">{text}</h5>
    </div>
  )
}

export default Loader