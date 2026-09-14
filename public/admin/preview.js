CMS.init();
CMS.registerPreviewStyle('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
CMS.registerPreviewStyle('./preview.css');

CMS.registerPreviewTemplate('projects', createClass({
  render: function () {
    const entry = this.props.entry;
    const images = entry.getIn(['data', 'images']);
    return h('article', { className: 'project' },
      h('div', { className: 'project-gallery' }, images ? images.map((image, index) => h('img', {
        key: index,
        src: String(this.props.getAsset(image.get('image'))),
        alt: image.get('alt') || '',
        style: { width: '100%', marginBottom: '16px' }
      })).toArray() : null),
      h('div', { className: 'project-details' }, this.props.widgetFor('body'))
    );
  }
}));
