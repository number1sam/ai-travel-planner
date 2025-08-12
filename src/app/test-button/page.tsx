'use client'

export default function TestButton() {
  return (
    <div style={{ padding: '50px' }}>
      <h1>Button Test</h1>
      <button 
        onClick={() => {
          alert('BUTTON WORKS!')
          console.log('Button clicked successfully')
        }}
        style={{
          backgroundColor: 'red',
          color: 'white',
          padding: '20px',
          fontSize: '20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        CLICK ME
      </button>
    </div>
  )
}