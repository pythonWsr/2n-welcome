import {createCourtyardGallery} from './people-layout.js';

/** Production text consumes the controller's shared route. */
export function createPeopleGallery(data,route){
 if(!route)throw new Error('人物章节需要共享路线。');
 return createCourtyardGallery(data,route);
}
