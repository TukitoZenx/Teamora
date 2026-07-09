const contentService = require('../services/content.service');

const getContent = async (req, res, next) => {
  try {
    const result = await contentService.getContent(req.user._id, req.params.id, req.params.key);
    res.status(200).json({ success: true, content: result });
  } catch (error) {
    next(error);
  }
};

const putContent = async (req, res, next) => {
  try {
    const result = await contentService.putContent(req.user._id, req.params.id, req.params.key, req.body?.data);
    res.status(200).json({ success: true, content: result });
  } catch (error) {
    next(error);
  }
};

const listContentKeys = async (req, res, next) => {
  try {
    const keys = await contentService.listContentKeys(req.user._id, req.params.id, req.query.prefix || '');
    res.status(200).json({ success: true, keys });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContent,
  putContent,
  listContentKeys
};
