/* Elliot Barer, ebarer [at] mac [dot] com, 2017-01-16 */


// Global variables
var playlists = [];
var songs = [];
var currentPage;
var currentSong;


// Add global listeners
window.addEventListener('DOMContentLoaded', function() {
    makeRequest('music-data.js', loadData);
});

document.getElementById('tab-library').addEventListener('click', function(){ loadPage('library') }, false);
document.getElementById('tab-playlists').addEventListener('click', function(){ loadPage('playlists') }, false);
document.getElementById('tab-search').addEventListener('click', function(){ loadPage('search') }, false);

// Add view-specific listeners
document.getElementById('sort-artist').addEventListener('click', function(){ sortByArtist() }, false);
document.getElementById('sort-title').addEventListener('click', function(){ sortByTitle() }, false);
document.getElementById('search').addEventListener('input', function(){ searchMusic() }, false);
document.querySelectorAll('#search form')[0].addEventListener('submit', function(event) {
    event.preventDefault();
});


// Load data from JSON file
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

var loadData = function(responseText) {
    playlists = window.MUSIC_DATA.playlists;
    songs = window.MUSIC_DATA.songs;
    loadPage('playlists');
    loadAddSongForm();
};

function loadPage(page, callback) {
    var animators = document.querySelectorAll('.navigation-animator');
    for (var i = 0; i < animators.length; i++) {
        animators[i].style.left = '0';
    }

    if (currentPage !== page) {
        currentPage = page;
        reset();

        switch(currentPage) {
            case 'library':
                sortByArtist();
                break;
            case 'playlists':
                loadPlaylists();
                break;
            case 'search':
                loadSearch();
                break;
            default: break;
        }
    }

    // Execute callback (if provided)
    if(callback && typeof callback == "function") {
        callback();
    }
}

function reset() {
    var nav = document.querySelectorAll('nav li');
    nav.forEach(function(element) {
        element.classList.remove('active');
    });

    var views = document.querySelectorAll('.view');
    views.forEach(function(view) {
       view.classList.remove('active');
    });
}


// Loading functions for each page
function loadLibrary() {
    document.getElementById('tab-library').classList.add('active');
    document.getElementById('library').classList.add('active');
    document.querySelectorAll('#library ul')[0].innerHTML = '';

    var list = document.querySelectorAll('#library ul')[0];
    for (var i = 0; i < songs.length; i++) {
        createSong(songs[i], list);
    }
};

function loadPlaylists() {
    document.getElementById('tab-playlists').classList.add('active');
    document.getElementById('playlists').classList.add('active');
    document.querySelectorAll('#playlists ul')[0].innerHTML = '';

    var list = document.querySelectorAll('#playlists ul')[0];
    for (var i = 0; i < playlists.length; i++) {
        createPlaylist(playlists[i], list);
    }
};

function loadSearch() {
    document.getElementById('tab-search').classList.add('active');
    document.getElementById('search').classList.add('active');

    // TODO: Should search results be maintained when switching from tab?
    //       From a usability perspective, I think it should...
    document.querySelectorAll('#search ul')[0].innerHTML = '';
};


// Loading functions for overlay forms
function loadAddSongForm() {
    var list = document.querySelectorAll('#add-song-form ul')[0];
    for (var i = 0; i < playlists.length; i++) {
        var listItem = document.createElement('li');
        var listItemTitle = document.createElement('a');
        listItemTitle.innerHTML = playlists[i].name;
        listItem.appendChild(listItemTitle);
        list.appendChild(listItem);

        listItem.addEventListener('click', addToPlaylist(playlists[i]), false);
    }
}

function displayForm(form) {
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

var addToPlaylist = function(currentPlaylist) {
    return function() {
        currentPlaylist.songs.push(currentSong.id)
        hideForm();
    }
}


// Navigation controller
var navigateToPlaylist = function(playlist) {
    return function() {
        loadPage('playlists');

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

        document.getElementById('playlist-name').innerHTML = playlist.name;

        var animator = document.querySelectorAll('#playlists .navigation-animator')[0];
        animator.style.left = '-100%';
    }
}


// Sorting
function sortByArtist() {
    document.getElementById('sort-title').classList.remove('active');
    document.getElementById('sort-artist').classList.add('active');

/*
    songs.sort(function(a,b) {
        return a.artist.toLowerCase().localeCompare(b.artist.toLowerCase());
    });
*/

    songs.sort(function(a, b) {
        return comparator(a.artist, b.artist)
    });

    loadLibrary();
};

function sortByTitle() {
    document.getElementById('sort-title').classList.add('active');
    document.getElementById('sort-artist').classList.remove('active');

/*
    songs.sort(function(a,b) {
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    });
*/

    songs.sort(function(a, b) {
        return comparator(a.title, b.title)
    });

    loadLibrary();
};

// http://stackoverflow.com/questions/34347008/
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


// Search
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

        console.log(matchedSongs);
        for (var i = 0; i < matchedSongs.length; i++) {
            createSong(matchedSongs[i], list);
        }
    }
}

//////////////////////////////////////////////////
// Generate list items
//////////////////////////////////////////////////

// Create playlist item
function createPlaylist(playlist, list) {
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

// Create song item
function createSong(song, list) {
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



