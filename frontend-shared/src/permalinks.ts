/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import {Component, createContext, useContext} from 'react';
import h from 'react-hyperscript';
import {Link, Route, useRouteMatch} from 'react-router-dom';
import {Navbar} from '@blueprintjs/core';
import {LinkButton} from '@macrostrat/ui-components';
import T from 'prop-types';
import {AppMode} from './enum';
import {ImageShape} from './types';

const PermalinkContext = createContext({});

const permalinkRouteTemplate = appMode => `/${appMode}/:stackId/page/:imageId`;

class PermalinkProvider extends Component {
  constructor(...args) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.permalinkTo = this.permalinkTo.bind(this);
    super(...args);
  }

  static initClass() {
    this.propTypes = {
      appMode: T.oneOf([
        AppMode.ANNOTATION,
        AppMode.PREDICTION
      ])
    };
  }

  permalinkTo({stack_id, image_id}){
    const {pageTemplate} = this.getValue();
    return pageTemplate
      .replace(":stackId",stack_id)
      .replace(":imageId",image_id);
  }

  getValue() {
    const {appMode} = this.props;
    const {permalinkTo} = this;
    const pageTemplate = permalinkRouteTemplate(appMode);
    return {appMode, pageTemplate, permalinkTo};
  }

  render() {
    const {appMode, ...rest} = this.props;
    const value = this.getValue();
    return h(PermalinkContext.Provider, {value, ...rest});
  }
}
PermalinkProvider.initClass();

const PermalinkButton = function({image}){
  const ctx = useContext(PermalinkContext);
  const {params: {imageId, stackId}} = useRouteMatch();
  if (image == null) { return null; }
  const {image_id, stack_id} = image;
  let text = "Permalink";
  let disabled = false;

  if ((image_id === imageId) && (stack_id === stackId)) {
    // We are at the permalink right now
    disabled = true;
    text = [h('span', [text, " to image "]), h('code', image_id)];
  }
  return h(LinkButton, {
    icon: 'bookmark',
    to: ctx.permalinkTo({stack_id, image_id}),
    disabled,
    text
  });
};

PermalinkButton.propTypes = {
  image: ImageShape
};

export {
  PermalinkButton,
  PermalinkProvider,
  PermalinkContext,
  permalinkRouteTemplate
};
