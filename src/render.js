


document.addEventListener('DOMContentLoaded', async () => { 
 
  let state = {
      playlists: { 'Моя музыка': [] },
      currentPlaylist: 'Моя музыка',
      currentTrackIndex: -1,
      volume: 50
  }

  document.getElementById('minimize-btn').addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });
  
  document.getElementById('maximize-btn').addEventListener('click', () => {
    window.electronAPI.toggleMaximizeWindow();
  });
  
  document.getElementById('close-btn').addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
  
  const audioPlayer = document.getElementById('audioPlayer')
  const playPauseBtn = document.getElementById('playPauseBtn')
  const prevBtn = document.getElementById('prevBtn')
  const nextBtn = document.getElementById('nextBtn')
  const addBtn = document.getElementById('addBtn')
  const progressBar = document.getElementById('progressBar')
  const currentTimeEl = document.getElementById('currentTime')
  const durationEl = document.getElementById('duration')
  const playlistEl = document.getElementById('playlist')
  const volumeControl = document.getElementById('volume-control')
  const playlistModal = document.getElementById('playlistModal')
  const playlistNameInput = document.getElementById('playlistNameInput')
  const cancelPlaylistBtn = document.getElementById('cancelPlaylistBtn')
  const confirmPlaylistBtn = document.getElementById('confirmPlaylistBtn')
  const createPlaylistBtn = document.querySelector('.playlist-sidebar button')
  const songListsEl = document.getElementById('SongLists')
  const playlistNameEl = document.getElementById('PlayListName')


  async function loadData() {
      const savedData = await window.electronAPI.loadPlayerData()
      if (savedData) {
          state = {
              ...state,
              ...savedData
          }
          
        
          if (savedData.volume !== undefined) {
              volumeControl.value = savedData.volume
              audioPlayer.volume = savedData.volume / 100
          }
      }
  }

  let saveTimeout
  async function saveData() {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(async () => {
          try {
              await window.electronAPI.savePlayerData(state)
          } catch (error) {
              console.error('Failed to save data:', error)
          }
      }, 1000)
  }

 
  function playTrack(index) {
      const currentTracks = state.playlists[state.currentPlaylist] || []
      if (index >= 0 && index < currentTracks.length) {
          state.currentTrackIndex = index
          audioPlayer.src = currentTracks[index].path
          audioPlayer.play()
          playPauseBtn.textContent = '⏸'
          renderPlaylist()
          saveData()
      }
  }

  
  function showAlert(message) {
      const alertEl = document.createElement('div')
      alertEl.className = 'alert'
      alertEl.textContent = message
      document.body.appendChild(alertEl)
      
      setTimeout(() => alertEl.remove(), 3000)
  }

 
  function initUI() {
     
      songListsEl.innerHTML = ''
      Object.keys(state.playlists).forEach(playlistName => {
          const li = document.createElement('li')
          li.textContent = playlistName
          li.addEventListener('click', () => {
              state.currentPlaylist = playlistName
              playlistNameEl.textContent = playlistName
              renderPlaylist()
              saveData()
          })
          songListsEl.appendChild(li)
      })
      
      renderPlaylist()
  }


  function renderPlaylist() {
      playlistEl.innerHTML = ''
      const currentTracks = state.playlists[state.currentPlaylist] || []
      
      currentTracks.forEach((track, index) => {
          const li = document.createElement('li')
          li.textContent = track.name
          li.classList.toggle('playing', index === state.currentTrackIndex)
          li.addEventListener('click', () => playTrack(index))
          playlistEl.appendChild(li)
      })
  }

  
  function formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

 
  await loadData() 
  initUI()

  
  createPlaylistBtn.addEventListener('click', () => {
      playlistModal.style.display = 'block'
      playlistNameInput.focus()
  })

  cancelPlaylistBtn.addEventListener('click', () => {
      playlistModal.style.display = 'none'
      playlistNameInput.value = ''
  })

  confirmPlaylistBtn.addEventListener('click', () => {
      const playlistName = playlistNameInput.value.trim()
      if (playlistName) {
          if (!state.playlists[playlistName]) {
              state.playlists[playlistName] = []
              playlistModal.style.display = 'none'
              playlistNameInput.value = ''
              initUI() 
              saveData() 
          } else {
              showAlert('Плейлист с таким именем уже существует!')
          }
      }
  })

  addBtn.addEventListener('click', async () => {
      const filePaths = await window.electronAPI.openFileDialog()
      if (filePaths) {
          filePaths.forEach(filePath => {
              const fileName = filePath.split('/').pop().split('\\').pop()
              if (!state.playlists[state.currentPlaylist]) {
                  state.playlists[state.currentPlaylist] = []
              }
              state.playlists[state.currentPlaylist].push({ 
                  name: fileName, 
                  path: filePath,
                  addedAt: Date.now()
              })
          })
          
          renderPlaylist()
          if (state.currentTrackIndex === -1 && state.playlists[state.currentPlaylist].length > 0) {
              playTrack(0)
          }
          saveData()
      }
  })

  volumeControl.addEventListener('input', () => {
      const volume = volumeControl.value
      audioPlayer.volume = volume / 100
      state.volume = volume
      saveData()
  })

  playPauseBtn.addEventListener('click', () => {
      if (audioPlayer.paused) {
          if (audioPlayer.src) {
              audioPlayer.play()
              playPauseBtn.textContent = '⏸'
          } else if (state.playlists[state.currentPlaylist]?.length > 0) {
              playTrack(0)
          }
      } else {
          audioPlayer.pause()
          playPauseBtn.textContent = '⏵'
      }
  })

  prevBtn.addEventListener('click', () => {
      const currentTracks = state.playlists[state.currentPlaylist] || []
      if (currentTracks.length > 0) {
          const newIndex = (state.currentTrackIndex - 1 + currentTracks.length) % currentTracks.length
          playTrack(newIndex)
      }
  })

  nextBtn.addEventListener('click', () => {
      const currentTracks = state.playlists[state.currentPlaylist] || []
      if (currentTracks.length > 0) {
          const newIndex = (state.currentTrackIndex + 1) % currentTracks.length
          playTrack(newIndex)
      }
  })

  audioPlayer.addEventListener('timeupdate', () => {
      const currentTime = audioPlayer.currentTime
      const duration = audioPlayer.duration || 1
      const progressPercent = (currentTime / duration) * 100
      progressBar.style.setProperty('--progress', `${progressPercent}%`)
      currentTimeEl.textContent = formatTime(currentTime)
      if (!isNaN(duration)) {
          durationEl.textContent = formatTime(duration)
      }
  })

  progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect()
      const clickPosition = (e.clientX - rect.left) / rect.width
      if (audioPlayer.duration) {
          audioPlayer.currentTime = clickPosition * audioPlayer.duration
      }
  })

  audioPlayer.addEventListener('ended', () => {
      nextBtn.click()
  })
})