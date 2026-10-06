import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Media } from './media';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {

  // Spotify caps search/catalog requests at 10 items per page
  private static readonly PAGE_SIZE = 10;

  constructor(private http: HttpClient) {
  }

  /** Fetches consecutive pages and merges them into one response with up to `total` items. */
  private getPaged(url: string, params: Record<string, string>, total: number): Observable<any> {
    const pageSize = SpotifyService.PAGE_SIZE;
    const fetchPage = (offset: number) => this.http.get<any>(url, {
      params: { ...params, limit: String(pageSize), offset: String(offset) }
    }).pipe(map(page => ({ page, offset })));

    return fetchPage(0).pipe(
      expand(({ page, offset }) => {
        const next = offset + pageSize;
        return page?.next && next < total ? fetchPage(next) : EMPTY;
      }),
      reduce((items: any[], { page }) => items.concat(page?.items ?? []), [] as any[]),
      map(items => ({ items: items.slice(0, total) }))
    );
  }

  getMediaByQuery(query: string, category: string): Observable<Media[]> {
    const searchUrl = `${environment.apiUrl}/spotify/search/albums`;
    
    return this.getPaged(searchUrl, { q: query }, 50).pipe(
      map((response: any) => {
        return response.items.map(item => {
          const media: Media = {
            id: item.id,
            artist: item.artists[0].name,
            title: item.name,
            cover: item.images[0]?.url,
            type: 'spotify',
            category
          };
          return media;
        });
      })
    );
  }

  getMediaByArtistID(id: string, category: string): Observable<Media[]> {
    const artistUrl = environment.production ? `../api/spotify/artists/${id}/albums` : `http://localhost:8200/api/spotify/artists/${id}/albums`;
    
    return this.getPaged(artistUrl, {}, 50).pipe(
      map((response: any) => {
        return response.items.map(item => {
          const media: Media = {
            id: item.id,
            artist: item.artists[0].name,
            title: item.name,
            cover: item.images[0]?.url,
            type: 'spotify',
            category
          };
          return media;
        });
      })
    );
  }

  getMediaByID(id: string, category: string): Observable<Media> {
    const albumUrl = environment.production ? `../api/spotify/albums/${id}` : `http://localhost:8200/api/spotify/albums/${id}`;
    
    return this.http.get<any>(albumUrl).pipe(
      map((response: any) => {
        const media: Media = {
          id: response.id,
          artist: response.artists?.[0]?.name,
          title: response.name,
          cover: response?.images[0]?.url,
          type: 'spotify',
          category
        };
        return media;
      })
    );
  }

  getAlbumArtwork(artist: string, title: string): Observable<string> {
    const searchUrl = `${environment.apiUrl}/spotify/search/albums`;
    const query = `album:${title} artist:${artist}`;
    
    return this.http.get<any>(searchUrl, { 
      params: { q: query, limit: '1' }
    }).pipe(
      map((response: any) => {
        return response?.items?.[0]?.images?.[0]?.url || '';
      })
    );
  }

  searchAlbums(query: string): Observable<Media[]> {
    const searchUrl = `${environment.apiUrl}/spotify/search/albums`;
    
    return this.getPaged(searchUrl, { q: query }, 20).pipe(
      map((response: any) => {
        return response.items.map(item => {
          const media: Media = {
            id: item.id,
            artist: item.artists[0].name,
            title: item.name,
            cover: item.images[0]?.url,
            type: 'spotify',
            category: 'audiobook'
          };
          return media;
        });
      })
    );
  }

  searchArtists(query: string): Observable<any[]> {
    const searchUrl = `${environment.apiUrl}/spotify/search/artists`;
    
    return this.getPaged(searchUrl, { q: query }, 20).pipe(
      map((response: any) => {
        return response.items.map(item => ({
          id: item.id,
          name: item.name,
          image: item.images[0]?.url,
          followers: item.followers.total
        }));
      })
    );
  }

  searchTracks(query: string, category: string): Observable<Media[]> {
    const searchUrl = `${environment.apiUrl}/spotify/search/tracks`;
    
    return this.getPaged(searchUrl, { q: query }, 20).pipe(
      map((response: any) => {
        return response.items.map(item => {
          const media: Media = {
            id: item.album.id,
            artist: item.artists[0].name,
            title: item.album.name,
            cover: item.album.images[0]?.url,
            type: 'spotify',
            category
          };
          return media;
        });
      })
    );
  }
}
