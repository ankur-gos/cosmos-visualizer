/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import {Component, memo} from 'react';
import h from 'react-hyperscript';
import classNames from 'classnames';
import {GDDReferenceCard} from '@macrostrat/ui-components';
import {join, basename} from 'path';
import {memoize} from 'underscore';
import styled from '@emotion/styled';
import {ImageStoreContext} from '../image-container';

class KBImage extends Component {
  static initClass() {
    this.contextType = ImageStoreContext;
  }
  render() {
    let src;
    const {publicURL} = this.context;
    const {path, bytes, ...rest} = this.props;
    if (bytes != null) {
        src="data:image/png;base64," + bytes;
    } else {
        const fn = path.replace("img/", "");
        src = join(publicURL,"kb-images", fn);
      }
    
    return h('img', {src, ...rest});
  }
}
KBImage.initClass();

class KBCode extends Component {
  render() {
    const {publicURL} = this.context;
    const {path, entityType, unicode, ...rest} = this.props;
    return h('div', {style: {'font-family': 'monospace'}}, unicode);
  }
}

const getEntityType = path => // Hack to get entity type from image path
basename(path, '.png').replace(/\d+$/, "");

class KBExtraction extends Component {
  render() {
    let {unicode, path, className, title, entityType, ...rest} = this.props;
    //entityType = getEntityType(path)
    //if entityType == "Body Text"
      //return null

    className = classNames(className, "extracted-entity");

    return h('div', {className}, [
      h('div.main', [
        h('div.kb-image-container', [
          h('h2', [
            entityType
          ]),
          entityType === "code" ?
            h(KBCode, {path, entityType, unicode, ...rest})
          :
            h(KBImage, {path, entityType, ...rest})
        ])
      ])
    ]);
  }
}

const sanitize = memoize(t => t.toLowerCase());

const MatchSpan = styled.span`\
display: inline-block;
background-color: dodgerblue;
border-radius: 2px;
padding: 1px 2px;
color: white;\
`;

const EntityType = styled.span`\
font-style: italic;
color: #888;
font-weight: 400;\
`;

const MatchParagraph = styled.p`\
font-size: 0.8em;
padding: 0.5em 1em;\
`;

const TextMatch = function(props){
  let {query, text, entityType} = props;
  if (text == null) { return null; }
  text = sanitize(text);

  if (query == null) { return null; }
  if (query === "") { return null; }
  const ix = text.indexOf(sanitize(query));
  console.log(ix);
  const ixEnd = ix + query.length;
  let start = ix-100;
  let end = ixEnd+100;

  // Clamp endpoints
  if (start < 0) { start = 0; }
  if (end > text.length) { end = text.length; }

  const match = text.substring(ix, ixEnd);
  return h("div.match", [
    h('h2', [
      "Match ",
      h(EntityType, `(in ${entityType})`)
    ]),
    h(MatchParagraph, [
      text.substring(start, ix),
      h(MatchSpan, text.substring(ix, ixEnd)),
      text.substring(ixEnd, end)
    ])
  ]);
};

class ModelExtraction extends Component {
  render() {
    let docid, entityType, gddCard;
    const {query, target_img_path, target_unicode,
     assoc_img_path, assoc_unicode, bytes, content, pdf_name, _id, page_num, filename, line_number, full_content} = this.props;

    let main_img_path = null;
    let main_unicode = null;


    let assoc = null;
    if (assoc_img_path != null) {
      main_img_path = assoc_img_path;
      main_unicode;
      assoc = h(KBExtraction, {
        title: "Associated entity",
        path: assoc_img_path,
        unicode: assoc_unicode
      });
    }

    // Don't assume existence of target
    let target = null;
    if (target_img_path != null) {
      main_img_path = target_img_path;
      main_unicode = target_unicode;
      target = h(KBExtraction, {
        title: "Extracted entity",
        className: 'target',
        path: target_img_path,
        unicode: target_unicode
      });
    }

    // TODO: handle the new format here.
    if (bytes != null) {
      main_img_path = 'page ' + page_num + ' of docid ' + _id.replace('.pdf', '');
      entityType = this.props['class'];
      main_unicode = content;
      assoc = h(KBExtraction, {
        title: "Extracted thing",
        bytes,
        unicode: content,
        path: _id,
        entityType
      });
    }

    if (full_content != null) {
      main_img_path = 'line ' + line_number + ' of file ' + filename;
      main_unicode = full_content;
      entityType = this.props['class'];
      assoc = h(KBExtraction, {
        title: "Extracted thing",
        unicode: content,
        path: _id,
        entityType
      });
    }

    // We don't have a result unless either main or target are defined
    if (main_img_path == null) { return null; }

    try {
      // Stupid hack
      docid = main_img_path.match(/([a-f0-9]{24})/g)[0];
      gddCard = h(GDDReferenceCard, {docid});
    } catch (error) {
      gddCard = null;
    }

    try {
      docid = pdf_name.match(/([a-f0-9]{24})/g)[0];
      gddCard = h(GDDReferenceCard, {docid});
    } catch (error1) {
      gddCard = null;
    }

    return h('div.model-extraction', [
      target,
      assoc,
      h(TextMatch, {
        entityType: getEntityType(main_img_path),
        text: main_unicode,
        query
      }),
      gddCard
    ]);
  }
}

export {ModelExtraction};