(function () {
  const button = document.getElementById('print-transcript')
  if (!button) return
  button.addEventListener('click', function () {
    window.print()
  })
})()
