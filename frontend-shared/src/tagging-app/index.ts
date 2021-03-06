/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import "~/shared/_init"
import {getEnvironmentConfig} from '~/shared/_env'

import {render} from 'react-dom';
import h, {compose, C} from '@macrostrat/hyper'
import {APIProvider} from '../api';
import {ImageStoreProvider} from './page-interface';
import {PublicURLProvider} from '~/providers'
import {TaggingApplication} from './app'

const AppHolder = (props)=>{
  const {baseURL, imageBaseURL, publicURL, children} = props
  // Nest a bunch of providers
  return h(compose(
    C(PublicURLProvider,{publicURL}),
    C(APIProvider, {baseURL}),
    C(ImageStoreProvider, {baseURL: imageBaseURL}),
    C(TaggingApplication, props)
  ), children)
}

const createUI = function(opts){
  // Image base url is properly set here
  const el = document.createElement('div');
  document.body.appendChild(el);
  const env = getEnvironmentConfig(opts)
  const __ = h(AppHolder, {...env});
  return render(__, el);
};

// Actually run the UI (changed for webpack)
createUI();
