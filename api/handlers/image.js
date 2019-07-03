/*
Handler for both `image` and `image_prediction` routes
*/
const {wrapHandler} = require('./util')

module.exports = ()=> {

  const baseSelect = `
    SELECT
      i.image_id,
      doc_id,
      page_no,
      stack_id stack,
      file_path,
      i.created
    FROM image i
    JOIN image_stack istack USING (image_id)
    JOIN stack USING (stack_id)`

  const handler = async (req, res, next, plugins) => {
    const {db} = plugins;
    let whereStatement = 'WHERE true'
    let params=[];
    // TODO: revisit + cleanup the query-building logic

    if (req.query.stack_name) {
        whereStatement += `\nAND stack_id = $${params.length + 1}`
        params.push(req.query.stack_name)
    }

    if (process.env.MAGIC_MODE === '1'){
        if (req.query.doc_id) {
            whereStatement += `\nAND doc_id = $${params.length + 1}`
            params.push(req.query.doc_id)
        }
        if (req.query.page_no) {
            whereStatement += `\nAND page_no = $${params.length + 1}`
            params.push(req.query.page_no)
        }
    }

    /* This gets us the next ALREADY TAGGED image */
    if (req.query.image_id === 'next') {
      type='annotation';
      if (req.query.stack_name) {
          withStatement = `
            WITH annotation_stack AS (SELECT * FROM image_stack JOIN stack USING (stack_id) WHERE stack_type='annotation' AND stack_id=$${params.length + 1}),
             annotated AS (SELECT image_id FROM image_tag JOIN annotation_stack USING (image_stack_id))
             `
          stackIdFilter=`AND stack_id=$${params.length + 1}`
          params.push(req.query.stack_name)
      } else {
          withStatement = `
        WITH annotation_stack AS (SELECT * FROM image_stack JOIN stack USING (stack_id) WHERE stack_type='annotation'),
         annotated AS (SELECT image_id FROM image_tag JOIN annotation_stack USING (image_stack_id))
         `
          stackIdFilter=''
      }
        whereStatement += `
        \nAND (
              tag_start IS NULL
           OR tag_start < now() - interval '5 minutes' )
          AND image_id NOT IN (SELECT image_id FROM annotated)
          AND stack_type = $${params.length + 1}
          ${stackIdFilter} 
        ORDER BY random()
        LIMIT 1`
         params.push(type)
      console.log(`
        ${withStatement}
        ${baseSelect}
        ${whereStatement}`, params);
      let row = await db.one(`
        ${withStatement}
        ${baseSelect}
        ${whereStatement}`, params);
//      await db.query(`
//        UPDATE image
//        SET tag_start = now()
//        WHERE image_id = $1`, [row.image_id]);
      res.reply(req, res, next, row);

    } else if ( req.query.image_id === 'validate') {
      type='annotation';
      if (req.query.validated == false) {
        whereStatement += '\nAND validator IS NULL'
      } else if (req.query.validated == true) {
        whereStatement += '\n AND WHERE validator IS NOT NULL'
      }
      whereStatement += "\nAND stack_type = $1"
      params.push(type)
      if (req.query.stack_name) {
          where += "\nAND stack_id = $2"
          params.push(req.query.stack_name)
      }

      try {
        let row = await db.one(`
          ${baseSelect}
          JOIN image_tag it
          USING (image_stack_id)
          ${whereStatement}
          ORDER BY random()
          LIMIT 1`, params);
        console.log(`
          ${baseSelect}
          JOIN image_tag it
          USING (image_stack_id)
          ${whereStatement}
          ORDER BY random()
          LIMIT 1`, params);

        if (!row) {
          return res.reply(req, res, next, []);
        } else {
          return res.reply(req, res, next, row);
        }

        // Update the tag start
        await db.none(`
          UPDATE image
          SET tag_start = now()
          WHERE image_id = $1`, [row.image_id]);

      } catch(error) {
        console.log(error)
        return res.error(req, res, next, 'An internal error occurred', 500)
      }
      res.reply(req, res, next, row);
    } else if ( req.query.image_id === 'next_prediction') {
      type='prediction';
      let params = []
      if (req.query.stack_name) { 
          whereStatement += `\n AND stack_id = $${params.length + 1}`
          params.push(req.query.stack_name)
      } else {
          whereStatement += 'WHERE true'
      }
      whereStatement += `\nAND stack_type = $${params.length + 1}`
      params.push(type)

      try {
          let row = await db.one(`SELECT
           i.image_id,
           i.doc_id,
           i.page_no,
           stack_id stack,
           file_path,
           i.created
         FROM image i
         JOIN image_stack istack USING (image_id)
         JOIN stack USING (stack_id)
               ${whereStatement}
               ORDER BY random()
               LIMIT 1`, params);
        if (!row) {
          return res.reply(req, res, next, []);
        } else {
          return res.reply(req, res, next, row);
        }

      } catch(error) {
        console.log(error)
        return res.error(req, res, next, 'An internal error occurred', 500)
      }
      res.reply(req, res, next, row);
    } else if ( req.query.image_id === 'next_eqn_prediction') {
        //TODO : this type should key into the stack_type column in the stack table instead of the stack_id like it does now
      type='prediction';
      whereStatement += "\nAND stack_type = $1"
        params.push(type)
      if (req.query.stack_id) { 
          whereStatement += "\n AND stack_id = $2"
        params.push(req.query.stack_id)
      }
      // Make sure we only get images with phrases or tags

      try {
        let row = await db.one(`SELECT
           i.image_id,
           i.doc_id,
           i.page_no,
           stack_id stack,
           file_path,
           i.created
         FROM image i
         JOIN image_stack istack USING (image_id)
         JOIN stack USING (stack_id)
               JOIN equations.equation p
               ON p.image_id = i.image_id
               WHERE true
               ORDER BY random()
               LIMIT 1`);

        if (!row) {
          return res.reply(req, res, next, []);
        } else {
          return res.reply(req, res, next, row);
        }

      } catch(error) {
        console.log(error)
        return res.error(req, res, next, 'An internal error occurred', 500)
      }
      res.reply(req, res, next, row);

    } else {
        let row=undefined
        if (req.query.image_id != undefined) {
            console.log('not undefined')
            row = await db.one(`
                ${baseSelect.replace("stack_id stack", "array_agg(stack.stack_id) stacks")}
                WHERE image_id = $1

                  GROUP BY image_id, doc_id, page_no, file_path, created
                  LIMIT 1`,
                [req.query.image_id]
            );
        }
        else {
            console.log(`
                ${baseSelect.replace("stack_id stack", "array_agg(stack.stack_id) stacks")}
                ${whereStatement}
                  GROUP BY image_id, doc_id, page_no, file_path, created
                  LIMIT 1`,
                params
            );
            row = await db.one(`
                ${baseSelect.replace("stack_id stack", "array_agg(stack.stack_id) stacks")}
                ${whereStatement}
                  GROUP BY image_id, doc_id, page_no, file_path, created
                  LIMIT 1`,
                params
            );
        }
      console.log
      res.reply(req, res, next, row);
    }
  }

  return wrapHandler(handler);
};
