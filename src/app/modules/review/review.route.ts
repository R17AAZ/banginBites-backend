import express from 'express';
import { ReviewController } from './review.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';
import validateRequest from '../../middleware/validateRequest';
import { ReviewValidations } from './review.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.BUYER, USER_ROLES.SELLER), validateRequest(ReviewValidations.create), ReviewController.createReview);
router.get('/target/:targetType/:targetId', ReviewController.getReviewsByTarget);
router.get('/:type', auth(USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.ADMIN), ReviewController.getAllReviews);
router.patch('/:id/reply', auth(USER_ROLES.SELLER, USER_ROLES.ADMIN), validateRequest(ReviewValidations.reply), ReviewController.replyToReview);
router.patch('/:id/hide', auth(USER_ROLES.ADMIN), validateRequest(ReviewValidations.hide), ReviewController.hideReview);
router.patch('/:id', auth(USER_ROLES.BUYER, USER_ROLES.SELLER), validateRequest(ReviewValidations.update), ReviewController.updateReview);
router.delete('/:id', auth(USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.ADMIN), ReviewController.deleteReview);

export const ReviewRoutes = router;
