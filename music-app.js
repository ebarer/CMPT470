/* Elliot Barer, ebarer [at] mac [dot] com, 2017-01-16 */


//////////////////////////////////////////////////
// Global Variables
//////////////////////////////////////////////////
var playlists = [];
var songs = [];
var startPage = 'playlists';
var currentPage;
var currentPlaylist;
var currentSong;
var sortBy = 'artist';


//////////////////////////////////////////////////
// Load data from JSON
// Base app methods
//////////////////////////////////////////////////
window.addEventListener('DOMContentLoaded', function(){
    makeRequest('api/playlists', loadPlaylists);
});

var makeRequest = function(file, callback) {
    var xhr = new XMLHttpRequest();
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            callback(xhr.responseText);
        }
    }
    
    xhr.open('GET', file, true);
    xhr.send(null);
};

var postRequest = function(url, data) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-type", "application/json");    
    xhr.send(data);
}

var loadPlaylists = function(responseText) {
    playlists = JSON.parse(responseText).playlists;
    makeRequest('api/songs', loadSongs);
}

var loadSongs = function(responseText) {
    songs = JSON.parse(responseText).songs;
    loadData();
}

var loadData = function(responseText) {    
    var path = window.location.pathname;
    if (path !== '') {
        startPage = path.substr(1);
    }
    
    loadPage(startPage);
    loadAddSongForm();
};

var loadPage = function(page, callback) {
    var animators = document.querySelectorAll('.navigation-animator');
    for (var i = 0; i < animators.length; i++) {
        animators[i].style.left = '0';
    }

    if (currentPage !== page) {
        currentPage = page;
        reset();

        switch(currentPage) {
            case 'library':
                window.history.pushState({}, "Library", "/library");
                loadLibraryTab();
                break;
            case 'playlists':
                window.history.pushState({}, "Playlists", "/playlists");
                loadPlaylistsTab();
                break;
            case 'search':
                window.history.pushState({}, "Search", "/search");
                loadSearchTab();
                break;
            default: break;
        }
    }

    // Execute callback (if provided)
    if(callback && typeof callback == "function") {
        callback();
    }
}

var reset = function() {
    var nav = document.querySelectorAll('nav li');
    nav.forEach(function(element) {
        element.classList.remove('active');
    });

    var views = document.querySelectorAll('.view');
    views.forEach(function(view) {
       view.classList.remove('active');
    });
}


//////////////////////////////////////////////////
// Global and View-Specific Listeners
//////////////////////////////////////////////////
document.getElementById('tab-library').addEventListener('click', function(event){
    event.preventDefault();
    loadPage('library')
}, false);
document.getElementById('tab-playlists').addEventListener('click', function(event){
    event.preventDefault();
    loadPage('playlists')
}, false);
document.getElementById('tab-search').addEventListener('click', function(event){
    event.preventDefault();
    loadPage('search')
}, false);

document.getElementById('sort-artist').addEventListener('click', function(){
    setSortBy('artist');
    loadLibraryTab();    
}, false);
document.getElementById('sort-title').addEventListener('click', function(){
    setSortBy('title');
    loadLibraryTab();
}, false);
document.getElementById('search').addEventListener('input', searchMusic, false);

document.querySelectorAll('#search form')[0].addEventListener('submit', function(event){
    event.preventDefault();
});


//////////////////////////////////////////////////
// Views
//////////////////////////////////////////////////
var loadLibraryTab = function() {
    document.getElementById('tab-library').classList.add('active');
    document.getElementById('library').classList.add('active');

    if (sortBy === 'title') {
        sortByTitle();
    } else {
        sortByArtist();
    }

    var list = document.querySelectorAll('#library ul')[0];
    list.innerHTML = '';
    for (var i = 0; i < songs.length; i++) {
        createSong(songs[i], list);
    }
};

var loadPlaylistsTab = function() {
    document.getElementById('tab-playlists').classList.add('active');
    document.getElementById('playlists').classList.add('active');

    var list = document.querySelectorAll('#playlists ul')[0];
    list.innerHTML = '';
    for (var i = 0; i < playlists.length; i++) {
        createPlaylist(playlists[i], list);
    }
};

var loadSearchTab = function() {
    document.getElementById('tab-search').classList.add('active');
    document.getElementById('search').classList.add('active');
};


//////////////////////////////////////////////////
// Overlay forms
//////////////////////////////////////////////////
var displayForm = function(form) {
    document.getElementsByTagName('body')[0].classList.add('preventScroll');
    document.getElementsByClassName('overlay')[0].classList.add('active');
    document.getElementById(form).classList.add('active');

    var closeButton = document.getElementById(form).querySelectorAll('#form-close')[0];
    closeButton.addEventListener('click', hideForm, false);
}

var hideForm = function() {
    document.getElementsByTagName('body')[0].classList.remove('preventScroll');
    document.getElementsByClassName('overlay')[0].classList.remove('active');

    var activeForm = document.getElementsByClassName('overlay-form active')[0];
    var closeButton = activeForm.querySelectorAll('#form-close')[0];
    closeButton.removeEventListener('click', hideForm);
    activeForm.classList.remove('active');
}

var loadAddSongForm = function() {
    var list = document.querySelectorAll('#add-song-form ul')[0];
    list.innerHTML = '';
    for (var i = 0; i < playlists.length; i++) {
        var listItem = document.createElement('li');
        var listItemTitle = document.createElement('a');
        listItemTitle.innerHTML = playlists[i].name;
        listItem.appendChild(listItemTitle);
        list.appendChild(listItem);

        listItem.addEventListener('click', addToPlaylist(playlists[i]), false);
    }
}

var addToPlaylist = function(selectedPlaylist) {
    return function() {
        selectedPlaylist.songs.push(currentSong.id);

        postRequest('/api/playlists', JSON.stringify({'playlists':playlists}, null, '\t'));
        
        if (currentPage == "playlists" && currentPlaylist === selectedPlaylist) {
            loadPlaylist(selectedPlaylist);
        }
        
        hideForm();
    }
}


//////////////////////////////////////////////////
// Navigation Controller
//////////////////////////////////////////////////
var navigateToPlaylist = function(playlist) {
    return function() {
        currentPlaylist = playlist;
        
        loadPage('playlists');
        loadPlaylist(playlist);

        document.getElementById('playlist-name').innerHTML = playlist.name;

        // Scroll playlist view to the top, then animate in
        document.getElementById('playlist-view').scrollTop = 0;
        var animator = document.querySelectorAll('#playlists .navigation-animator')[0];
        animator.style.left = '-100%';
    }
}

var loadPlaylist = function(playlist) {
    var list = document.querySelectorAll('#playlists ul.playlist-song-list')[0];
    list.innerHTML = '';
        
    var playlistSongs = songs.filter(function(item){
        return playlist.songs.indexOf(item.id) > -1
    });

    for (var i = 0; i < playlist.songs.length; i++) {
        var song = songs.filter(function(s){
            return playlist.songs[i] === s.id;
        });
        createSong(song[0], list);
    }
}


//////////////////////////////////////////////////
// Sorting
//////////////////////////////////////////////////
function setSortBy(sort) {
    sortBy = sort;
}

function sortByArtist() {    
    document.getElementById('sort-title').classList.remove('active');
    document.getElementById('sort-artist').classList.add('active');

    songs.sort(function(a, b) {
        return comparator(a.artist, b.artist)
    });
};

function sortByTitle() {    
    document.getElementById('sort-title').classList.add('active');
    document.getElementById('sort-artist').classList.remove('active');

    songs.sort(function(a, b) {
        return comparator(a.title, b.title)
    });
};

// Credit:  http://stackoverflow.com/questions/34347008/
// Concept, Regular Expression, and "Replacer" taken from the aforementioned URL
function comparator(a, b) {
    var articles = ['a', 'an', 'the'],
        re = new RegExp('^(?:(' + articles.join('|') + ') )(.*)$'), // e.g. /^(?:(foo|bar) )(.*)$/
        replacer = function ($0, $1, $2) {
            return $2 + ', ' + $1;
        };

    a = a.toLowerCase().replace(re, replacer);
    b = b.toLowerCase().replace(re, replacer);

    return a === b ? 0 : a < b ? -1 : 1;
}


//////////////////////////////////////////////////
// Search
//////////////////////////////////////////////////
function searchMusic() {    
    var input = document.querySelector('input[name="search"]');
    var searchString = input.value.toLowerCase();

    var list = document.querySelectorAll('#search ul')[0];
    list.innerHTML = '';

    // Avoid populating for empty string search
    if (searchString) {
        var matchedPlaylists = playlists.filter(function(playlist){
            return playlist.name.toLowerCase().includes(searchString);
        });

        var matchedSongs = songs.filter(function(song){
            return (song.title.toLowerCase().includes(searchString)) || (song.artist.toLowerCase().includes(searchString));
        });

        for (var i = 0; i < matchedPlaylists.length; i++) {
            createPlaylist(matchedPlaylists[i], list);
        }

        for (var i = 0; i < matchedSongs.length; i++) {
            createSong(matchedSongs[i], list);
        }
    }
}


//////////////////////////////////////////////////
// Generate list items
//////////////////////////////////////////////////
var createPlaylist = function(playlist, list) {
    var newPlaylistLi = document.createElement('li');
    newPlaylistLi.classList.add('row', 'playlist');

    var rowContainer = document.createElement('div');
    rowContainer.classList.add('row-container');
    newPlaylistLi.appendChild(rowContainer);

    var artworkItem = document.createElement('div');
    artworkItem.classList.add('row-artwork');

    var listTitle = document.createElement('h4');
    listTitle.classList.add('row-title');
    listTitle.innerHTML = playlist.name;

    var symbolChevron = document.createElement('span');
    symbolChevron.classList.add('glyphicon', 'glyphicon-chevron-right');

    rowContainer.appendChild(artworkItem);
    rowContainer.appendChild(symbolChevron);
    rowContainer.appendChild(listTitle);

    newPlaylistLi.addEventListener('click', navigateToPlaylist(playlist), false);

    list.appendChild(newPlaylistLi);
};

var createSong = function(song, list) {
    var newSongLi = document.createElement('li');
    newSongLi.classList.add('row', 'song');

    var rowContainer = document.createElement('div');
    rowContainer.classList.add('row-container');
    newSongLi.appendChild(rowContainer);

    var artworkItem = document.createElement('div');
    artworkItem.classList.add('row-artwork');

    var listTitle = document.createElement('h4');
    listTitle.classList.add('row-title');
    listTitle.innerHTML = song.title;

    var listSubtitle = document.createElement('p');
    listSubtitle.classList.add('row-subtitle');
    listSubtitle.innerHTML = song.artist;

    var symbolAdd = document.createElement('span');
    symbolAdd.classList.add('glyphicon', 'glyphicon-plus-sign');

    symbolAdd.addEventListener('click', function(){
        currentSong = song;
        displayForm('add-song-form')
    }, false);

    var symbolPlay = document.createElement('span');
    symbolPlay.classList.add('glyphicon', 'glyphicon-play');

    rowContainer.appendChild(artworkItem);
    rowContainer.appendChild(symbolAdd);
    rowContainer.appendChild(symbolPlay);
    rowContainer.appendChild(listTitle);
    rowContainer.appendChild(listSubtitle);

    list.appendChild(newSongLi);
}
