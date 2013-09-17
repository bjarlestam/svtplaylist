function load_jquery() {
	var jq = document.createElement("script");
	jq.src = "http://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js";
	document.getElementsByTagName("body")[0].appendChild(jq);
}

function load_css() {
	var css = document.createElement("link");
	css.rel = "stylesheet";
	css.type = "text/css";
	css.href = "http://localhost:9000/public/javascripts/bookmarklet.css";
	document.getElementsByTagName("head")[0].appendChild(css);
}

function Page() {
	this.isSvtplay = function() {
		return window.location.hostname === "www.svtplay.se";
	};

	this.goToSvtplay = function() {
		window.location = "http://www.svtplay.se";
	};

	this.getVideoInfo = function() {
		var title = document.title.split(' | SVT Play')[0];
		var url = window.location.href + '?type=embed';
		return {'title': title, 'url': url};
	};
}

function Playlist() {
	this.store = function(playList) {
		localStorage.setItem("svtplaylist", JSON.stringify(playList));
	};

	this.add = function(videoInfo) {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
			if(playList[i].url === videoInfo.url) {
				return false; //already stored
			}
		}
		playList.push(videoInfo);
		this.store(playList);
		return playList;
	};

	this.remove = function(url) {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
			if(playList[i].url === url) {
				playList.splice(i,1);
				this.store(playList);
				return;
			}
		}
	};

	this.get = function() {
		console.log('get');
		var playlist = JSON.parse(localStorage.getItem("svtplaylist"));
		if(playlist) {
			return playlist;
		} else {
			return [];
		}
//		return [
//			{title: 'Anna Lind', url:"http://www.svtplay.se/video/1456129/anna-lindh-1957-2003?type=embed"},
//			{title: 'Doobidoo', url:"http://www.svtplay.se/video/1453360/del-4-av-12?type=embed"},
//		];
	};
}

function Overlay(playlist, page) {
	this.overlay = undefined;
	this.player = undefined;
	this.playlist = playlist;

	this.show = function() {
		var self = this;
		if(!this.overlay) {
			this.overlay = $('<div id="playlistOverlay"></div>' );

			var menu = $(
					'<div id="playlistMenu">' +
					'<h2>Playlist</h2>' +
					'<ol id="playlistVideos"></ol>' +
					'</div>');

			//TODO check if video page
			var addButton = $('<button id="playlistAddButton"> Lägg till den här videon </button>');
			addButton.click(function() {
				var videoInfo = page.getVideoInfo();
				if(playlist.add(videoInfo)) {
					self.addVideoToList(videoInfo, self.overlay.find('#playlistVideos'));
				}
			});
			menu.append(addButton);
			this.overlay.append(menu);

			this.loadVideoList(this.overlay.find('#playlistVideos'));

			this.player = $('<div id="playlistPlayer"></div>');
			this.player.hide();
			this.overlay.append(this.player);

			$(document.body).append(this.overlay);
		} else {
			this.overlay.show();
		}
	};

	this.loadPlayer = function(videoUrl) {
		this.player.empty().load(videoUrl + ' .svtFullFrame', function() {
			console.log('loaded');
		});
		this.player.show();
	};

	this.loadVideoList = function(videoList) {
		var videoInfoList = this.playlist.get();
		for(var i=0; i < videoInfoList.length; i++) {
			this.addVideoToList(videoInfoList[i], videoList);
		}
	};

	this.addVideoToList = function(videoInfo, videoList) {
		var self = this;
		var video = $('<li data-url="' + videoInfo.url + '"></li>');
		var playButton = $('<span class="playButton">' + videoInfo.title + '</span>');
		playButton.click(function() {
			self.loadPlayer($(this).parent().attr("data-url"));
		});
		video.append(playButton);
		var removeButton = $('<button class="removeButton">x</button>');
		removeButton.click(function() {
			var listItem = $(this).parent();
			self.playlist.remove(listItem.attr("data-url"));
			listItem.remove();
		});
		video.append(removeButton);
		videoList.append(video);
	}

	this.hide = function() {
		this.overlay.hide();
	}
}

load_jquery();
load_css();
var currentPage = new Page();
var playlist = new Playlist();
var overlay = new Overlay(playlist, currentPage);

if(!currentPage.isSvtplay()) {
	currentPage.goToSvtplay();
}
overlay.show();