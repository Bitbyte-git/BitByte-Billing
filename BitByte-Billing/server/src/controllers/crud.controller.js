export function crudController(Model, options = {}) {
  return {
    async list(req, res, next) {
      try {
        const query = options.scope ? options.scope(req) : {};
        res.json(await Model.find(query).sort({ createdAt: -1 }));
      } catch (err) { next(err); }
    },
    async get(req, res, next) {
      try {
        const doc = await Model.findById(req.params.id);
        if (!doc) throw Object.assign(new Error('Not found'), { status: 404 });
        res.json(doc);
      } catch (err) { next(err); }
    },
    async create(req, res, next) {
      try {
        const body = options.beforeCreate ? await options.beforeCreate(req) : req.body;
        res.status(201).json(await Model.create(body));
      } catch (err) { next(err); }
    },
    async update(req, res, next) {
      try {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!doc) throw Object.assign(new Error('Not found'), { status: 404 });
        res.json(doc);
      } catch (err) { next(err); }
    },
    async remove(req, res, next) {
      try {
        await Model.findByIdAndDelete(req.params.id);
        res.status(204).send();
      } catch (err) { next(err); }
    }
  };
}
